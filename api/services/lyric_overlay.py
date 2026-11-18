"""Lyric video without libass: karaoke text is drawn with Pillow and piped to FFmpeg as an overlay.

Used automatically when the local FFmpeg build cannot load its `ass` filter (common with custom or
static builds). Same templates and timing as the ASS path; highlight advances word by word.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Callable, Optional

from PIL import Image, ImageDraw, ImageFont

from services import karaoke

_FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial Bold.ttf", "/Library/Fonts/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/lato/Lato-Bold.ttf",
]


def _font(size: int, bold: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    cands = _FONTS if bold else [f for f in _FONTS if "Bold" not in f] + _FONTS
    for p in cands:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default(size)


def _rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _layout(words: list[str], font, max_w: int, draw: ImageDraw.ImageDraw) -> list[list[int]]:
    """Greedy wrap -> rows of word indexes."""
    space = draw.textlength(" ", font=font)
    rows: list[list[int]] = [[]]
    cur = 0.0
    for i, w in enumerate(words):
        wl = draw.textlength(w, font=font)
        if rows[-1] and cur + space + wl > max_w:
            rows.append([])
            cur = 0.0
        cur += (space if rows[-1] else 0) + wl
        rows[-1].append(i)
    return rows


def render_lyric_video_overlay(lines: list[dict[str, Any]], template: str, aspect: str, overrides: dict[str, Any] | None,
                               background: Optional[str], audio: str, out: str, duration: float, w: int, h: int,
                               fps: int = 30, bg_color: str = "#0b0b12", preview: bool = False, audio_start: float = 0.0,
                               on_progress: Optional[Callable[[float], None]] = None) -> None:
    if template not in karaoke.TEMPLATES:
        raise ValueError(f"Unknown template {template}")
    st = {**karaoke.TEMPLATES[template], **(overrides or {})}
    scale = w / karaoke._RES[aspect][0]
    size = max(12, int(st["size"] * (0.6 if aspect == "9:16" else 1) * scale))
    font = _font(size, bool(st["bold"]))
    primary, highlight, outline = _rgb(st["primary"]), _rgb(st["highlight"]), _rgb(st["outline"])
    stroke = max(1, int(4 * scale))
    band_h = int(h * 0.42)
    y0 = {"bottom": h - band_h, "top": 0, "center": (h - band_h) // 2}[st["position"]]
    margin = int(h * 0.08)
    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    space = probe.textlength(" ", font=font)

    ev = []
    for ln in lines:
        ws = ln.get("words") or []
        if ws:
            ev.append((max(0.0, ws[0]["start"] - 0.3), ws[-1]["end"] + 0.4, ws))
    ev.sort(key=lambda e: e[0])

    blank = bytes(w * band_h * 4)
    cache: dict[tuple[int, int], bytes] = {}

    def frame_for(t: float) -> bytes:
        idx = -1
        for i, (s, e, _) in enumerate(ev):
            if s <= t < e:
                idx = i
        if idx < 0:
            return blank
        ws = ev[idx][2]
        sung = sum(1 for x in ws if x["start"] <= t)
        key = (idx, sung)
        if key in cache:
            return cache[key]
        words = [x["word"] for x in ws]
        img = Image.new("RGBA", (w, band_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        rows = _layout(words, font, w - 2 * int(60 * scale), d)
        lh = int(size * 1.25)
        total = lh * len(rows)
        if st["position"] == "bottom":
            ytop = band_h - margin - total
        elif st["position"] == "top":
            ytop = margin
        else:
            ytop = (band_h - total) // 2
        for r, row in enumerate(rows):
            rw = sum(d.textlength(words[i], font=font) for i in row) + space * (len(row) - 1)
            x = (w - rw) / 2
            for i in row:
                fill = highlight if i < sung else primary
                d.text((x, ytop + r * lh), words[i], font=font, fill=fill + (255,), stroke_width=stroke, stroke_fill=outline + (255,))
                x += d.textlength(words[i], font=font) + space
        b = img.tobytes()
        if len(cache) > 400:
            cache.clear()
        cache[key] = b
        return b

    cmd = ["ffmpeg", "-y", "-hide_banner", "-nostats", "-loglevel", "error"]
    if background:
        is_img = Path(background).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        cmd += (["-loop", "1"] if is_img else ["-stream_loop", "-1"]) + ["-t", f"{duration:.3f}", "-i", background]
    else:
        cmd += ["-f", "lavfi", "-i", f"color=c={bg_color.lstrip('#')}:s={w}x{h}:d={duration:.3f}:r={fps}"]
    cmd += (["-ss", f"{audio_start:.3f}"] if audio_start > 0 else []) + ["-i", audio]
    cmd += ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{band_h}", "-r", str(fps), "-i", "pipe:0"]
    fc = (f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={fps}[bg];"
          f"[2:v]format=rgba[ov];[bg][ov]overlay=0:{y0}:shortest=1,format=yuv420p[v]")
    crf, preset = ("30", "veryfast") if preview else ("18", "medium")
    cmd += ["-filter_complex", fc, "-map", "[v]", "-map", "1:a", "-t", f"{duration:.3f}", "-c:a", "aac", "-b:a", "192k",
            "-c:v", "libx264", "-preset", preset, "-crf", crf, "-movflags", "+faststart", out]

    errf = tempfile.TemporaryFile()
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=errf)
    n = int(duration * fps) + 1
    try:
        for i in range(n):
            p.stdin.write(frame_for(i / fps))  # type: ignore[union-attr]
            if on_progress and i % fps == 0:
                on_progress(min(0.99, i / n))
        p.stdin.close()  # type: ignore[union-attr]
    except BrokenPipeError:
        pass
    p.wait()
    if p.returncode != 0:
        errf.seek(0)
        raise RuntimeError("ffmpeg failed: " + errf.read().decode("utf-8", "replace")[-800:])
    if on_progress:
        on_progress(1.0)
