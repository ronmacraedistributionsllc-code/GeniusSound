"""Karaoke / lyric styling: ASS subtitle generation (word highlight) and SRT export.

Rendered by FFmpeg's libass — no Remotion needed. Fonts: only use fonts you are licensed to use
(see docs/LICENSING_AUDIT.md). Colours are given as #RRGGBB and converted to ASS &HBBGGRR.
"""
from __future__ import annotations

import re
from typing import Any

TEMPLATES = {
    "classic_karaoke": dict(font="Arial", size=64, primary="#FFFFFF", highlight="#FFD400", outline="#000000", position="bottom", bold=True, fade_ms=200),
    "bold_center": dict(font="Arial", size=96, primary="#FFFFFF", highlight="#FF2D55", outline="#000000", position="center", bold=True, fade_ms=150),
    "minimal_top": dict(font="Arial", size=48, primary="#EEEEEE", highlight="#00E5FF", outline="#111111", position="top", bold=False, fade_ms=300),
}
_ALIGN = {"bottom": 2, "center": 5, "top": 8}
_RES = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080)}


def _c(hexcolor: str) -> str:
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})", hexcolor)
    if not m:
        raise ValueError(f"Bad colour {hexcolor!r}")
    h = m.group(1)
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def _t(sec: float) -> str:
    cs = int(round(max(sec, 0) * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(s: str) -> str:
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def generate_ass(lines: list[dict[str, Any]], template: str = "classic_karaoke", aspect: str = "16:9",
                 overrides: dict[str, Any] | None = None, lead_in: float = 0.3, hold: float = 0.4) -> str:
    if template not in TEMPLATES:
        raise ValueError(f"Unknown template {template}")
    if aspect not in _RES:
        raise ValueError(f"Unsupported aspect {aspect}")
    st = {**TEMPLATES[template], **(overrides or {})}
    if st["position"] not in _ALIGN:
        raise ValueError("position must be bottom, center or top")
    w, h = _RES[aspect]
    size = int(st["size"] * (0.6 if aspect == "9:16" else 1))
    head = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {w}\nPlayResY: {h}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, "
        "StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{_esc(st['font'])},{size},{_c(st['highlight'])},{_c(st['primary'])},{_c(st['outline'])},&H64000000,"
        f"{-1 if st['bold'] else 0},0,0,0,100,100,0,0,1,4,2,{_ALIGN[st['position']]},60,60,{int(h * 0.08)},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Name, Style, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    ev = []
    for ln in lines:
        words = ln.get("words") or []
        if not words:
            continue
        start = max(0.0, words[0]["start"] - lead_in)
        end = words[-1]["end"] + hold
        parts, cursor = [], words[0]["start"]
        for wd in words:
            gap = max(0.0, wd["start"] - cursor)
            if gap >= 0.01:
                parts.append(f"{{\\k{int(round(gap * 100))}}}")  # silent gap
            dur = max(0.01, wd["end"] - wd["start"])
            parts.append(f"{{\\kf{int(round(dur * 100))}}}{_esc(wd['word'])} ")
            cursor = wd["end"]
        text = f"{{\\fad({st['fade_ms']},{st['fade_ms']})}}" + "".join(parts).rstrip()
        ev.append(f"Dialogue: 0,{_t(start)},{_t(end)},Default,,0,0,0,,{text}")
    return head + "\n".join(ev) + "\n"


def _srt_t(sec: float) -> str:
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def generate_srt(lines: list[dict[str, Any]]) -> str:
    out = []
    for i, ln in enumerate([l for l in lines if l.get("words")], 1):
        out.append(f"{i}\n{_srt_t(ln['words'][0]['start'])} --> {_srt_t(ln['words'][-1]['end'])}\n{ln['text']}\n")
    return "\n".join(out)
