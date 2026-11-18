"""Phase 8: lyrics parsing, ASR transcription and word-level alignment.

Clean-room implementation (no VocaVid code). Uses faster-whisper (MIT) for word timestamps when
installed. Alignment of user-supplied lyrics to ASR words uses a Needleman-Wunsch style DP with
fuzzy token similarity, then interpolates timing for words ASR missed.
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Optional

_HEADER = re.compile(r"^\s*[\[\(].*[\]\)]\s*$")


class TranscriptionUnavailable(Exception):
    """faster-whisper not installed or model could not load. Surface to the user; lyrics can still be entered manually."""


def parse_lyrics(text: str) -> list[dict[str, Any]]:
    """Split pasted lyrics into lines, dropping [Chorus]-style headers; remember the section tag."""
    out, section = [], None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if _HEADER.match(line):
            section = line.strip("[]() ").lower()
            continue
        out.append({"index": len(out), "text": line, "section": section})
    return out


def _norm(w: str) -> str:
    return re.sub(r"[^\w']", "", w.lower())


def transcribe(path: str, language: Optional[str] = None, model_size: Optional[str] = None) -> list[dict[str, Any]]:
    """Return ASR words [{word,start,end,probability}]. Never invents text."""
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError as e:
        raise TranscriptionUnavailable("faster-whisper is not installed (pip install faster-whisper)") from e
    import os
    size = model_size or os.getenv("WHISPER_MODEL", "small")
    try:
        model = WhisperModel(size, device="auto", compute_type="auto")
        segments, _ = model.transcribe(path, word_timestamps=True, language=language, vad_filter=True)
        words = []
        for seg in segments:
            for w in seg.words or []:
                words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3),
                              "probability": round(float(w.probability), 3)})
    except Exception as e:  # model download/load/decoding problems
        raise TranscriptionUnavailable(f"Transcription failed: {e}") from e
    return words


def _sim(a: str, b: str) -> float:
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def align(lines: list[dict[str, Any]], asr: list[dict[str, Any]], min_sim: float = 0.6,
          song_duration: Optional[float] = None) -> dict[str, Any]:
    """Align lyric lines to ASR words. Returns lines with per-word timing and a coverage report.

    word["source"] is "asr" (matched) or "interpolated" (timing estimated between neighbours).
    """
    toks: list[tuple[int, int, str]] = []  # (line_idx, word_idx, normalized)
    for li, ln in enumerate(lines):
        for wi, w in enumerate(ln["text"].split()):
            toks.append((li, wi, _norm(w)))
    n, m = len(toks), len(asr)
    if n == 0:
        return {"lines": [], "matched": 0, "total_words": 0, "coverage": 0.0}
    an = [_norm(a["word"]) for a in asr]
    GAP = -0.4
    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        score[i][0], back[i][0] = i * GAP, 1
    for j in range(1, m + 1):
        score[0][j], back[0][j] = j * GAP, 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = _sim(toks[i - 1][2], an[j - 1])
            diag = score[i - 1][j - 1] + (s * 2 - 1 if s >= min_sim else -1.0)
            up, left = score[i - 1][j] + GAP, score[i][j - 1] + GAP
            best = max(diag, up, left)
            score[i][j] = best
            back[i][j] = 0 if best == diag else (1 if best == up else 2)
    match: dict[int, int] = {}
    i, j = n, m
    while i > 0 or j > 0:
        mv = back[i][j] if i > 0 and j > 0 else (1 if i > 0 else 2)
        if mv == 0:
            if _sim(toks[i - 1][2], an[j - 1]) >= min_sim:
                match[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif mv == 1:
            i -= 1
        else:
            j -= 1
    times: list[Optional[tuple[float, float]]] = [None] * n
    for ti, aj in match.items():
        times[ti] = (asr[aj]["start"], asr[aj]["end"])
    # interpolate unmatched runs between known anchors
    known = [k for k in range(n) if times[k] is not None]
    t_end = song_duration if song_duration is not None else (asr[-1]["end"] if asr else 0.0)
    for k in range(n):
        if times[k] is not None:
            continue
        prev = max((x for x in known if x < k), default=None)
        nxt = min((x for x in known if x > k), default=None)
        lo = times[prev][1] if prev is not None else 0.0  # type: ignore[index]
        hi = times[nxt][0] if nxt is not None else max(t_end, lo)  # type: ignore[index]
        a = prev + 1 if prev is not None else 0
        b = nxt if nxt is not None else n
        span = (hi - lo) / max(b - a, 1)
        s = lo + (k - a) * span
        times[k] = (round(s, 3), round(s + span, 3))
    out_lines = []
    for li, ln in enumerate(lines):
        words = []
        for ti, (l, wi, _) in enumerate(toks):
            if l == li:
                st, en = times[ti]  # type: ignore[misc]
                words.append({"word": ln["text"].split()[wi], "start": st, "end": max(en, st + 0.01),
                              "source": "asr" if ti in match else "interpolated"})
        out_lines.append({**ln, "words": words,
                          "start": words[0]["start"] if words else 0.0, "end": words[-1]["end"] if words else 0.0})
    return {"lines": out_lines, "matched": len(match), "total_words": n, "coverage": round(len(match) / n, 3)}


def estimate_timing(lines: list[dict[str, Any]], start: float, end: float) -> dict[str, Any]:
    """No ASR available: spread lines by character count. Every word is flagged 'estimated' — the UI must say so."""
    total = sum(len(l["text"]) for l in lines) or 1
    t, out = start, []
    for ln in lines:
        dur = (end - start) * len(ln["text"]) / total
        ws = ln["text"].split()
        cw = sum(len(w) for w in ws) or 1
        words, c = [], t
        for w in ws:
            d = dur * len(w) / cw
            words.append({"word": w, "start": round(c, 3), "end": round(c + d, 3), "source": "estimated"})
            c += d
        out.append({**ln, "words": words, "start": round(t, 3), "end": round(t + dur, 3)})
        t += dur
    return {"lines": out, "matched": 0, "total_words": sum(len(l["words"]) for l in out), "coverage": 0.0}
