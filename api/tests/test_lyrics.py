import json
import shutil
import subprocess

import pytest

from services.assembly import render_lyric_video
from services.karaoke import generate_ass, generate_srt
from services.lyrics import TranscriptionUnavailable, align, estimate_timing, parse_lyrics, transcribe

LYR = "[Verse 1]\nWalk down the street tonight\nLights are burning bright\n\n[Chorus]\nWe never gonna stop"


def asr(words, t0=1.0, step=0.5):
    return [{"word": w, "start": t0 + i * step, "end": t0 + i * step + 0.4, "probability": 0.9} for i, w in enumerate(words)]


def test_parse_drops_headers():
    ls = parse_lyrics(LYR)
    assert [l["text"] for l in ls] == ["Walk down the street tonight", "Lights are burning bright", "We never gonna stop"]
    assert ls[2]["section"] == "chorus"


def test_align_matches_and_interpolates_missing_words():
    ls = parse_lyrics(LYR)
    heard = "walk down the street tonight lights are bright we never gonna stop".split()  # 'burning' missed by ASR
    r = align(ls, asr(heard))
    assert r["total_words"] == 13 and r["matched"] == 12
    burning = r["lines"][1]["words"][2]
    assert burning["word"] == "burning" and burning["source"] == "interpolated"
    prev, nxt = r["lines"][1]["words"][1], r["lines"][1]["words"][3]
    assert prev["end"] <= burning["start"] <= nxt["start"]
    # times never go backwards
    flat = [w for l in r["lines"] for w in l["words"]]
    assert all(a["start"] <= b["start"] for a, b in zip(flat, flat[1:]))


def test_align_tolerates_misheard_words():
    ls = parse_lyrics("hello darkness my old friend")
    r = align(ls, asr("hello darkness my old friends".split()))
    assert r["coverage"] == 1.0


def test_estimate_is_flagged():
    r = estimate_timing(parse_lyrics(LYR), 10, 40)
    assert all(w["source"] == "estimated" for l in r["lines"] for w in l["words"])
    assert r["lines"][-1]["end"] == pytest.approx(40, abs=0.01)


def test_ass_and_srt():
    r = estimate_timing(parse_lyrics("one two three"), 1, 4)
    ass = generate_ass(r["lines"], aspect="9:16", template="bold_center")
    assert "PlayResX: 1080" in ass and "\\kf" in ass and "Dialogue:" in ass and "Alignment" in ass
    assert "00:00:01,000 --> 00:00:04,000" in generate_srt(r["lines"])
    with pytest.raises(ValueError):
        generate_ass(r["lines"], template="nope")
    with pytest.raises(ValueError):
        generate_ass(r["lines"], overrides={"primary": "red"})


def test_transcribe_unavailable_is_explicit(tmp_path):
    try:
        import faster_whisper  # noqa
        pytest.skip("faster-whisper installed")
    except ImportError:
        with pytest.raises(TranscriptionUnavailable):
            transcribe(str(tmp_path / "x.wav"))


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg missing")
def test_lyric_video_renders(tmp_path):
    wav = tmp_path / "s.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=330:d=6", str(wav)], check=True)
    lines = estimate_timing(parse_lyrics("one two three\nfour five six"), 0.5, 5.5)["lines"]
    ass = tmp_path / "l.ass"
    ass.write_text(generate_ass(lines, aspect="9:16"))
    out = tmp_path / "lv.mp4"
    try:
        r = render_lyric_video(None, str(wav), str(ass), str(out), 6, aspect="9:16", preview=True)
    except RuntimeError as e:  # libass/fonts missing on this machine
        pytest.skip(f"libass unavailable: {e}")
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "json", str(out)],
                                     capture_output=True, text=True).stdout)
    assert info["streams"][0]["width"] == 540 and abs(r["duration"] - 6) < 0.3
