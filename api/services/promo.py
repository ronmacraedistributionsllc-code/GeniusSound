"""Phase 10: promo clip selection. Picks high-value, non-overlapping windows from an analysis result."""
from __future__ import annotations

from typing import Any

ALLOWED_DURATIONS = (10, 15, 30, 45, 60)
PLATFORMS = {  # all vertical 9:16
    "TIKTOK": {"aspect": "9:16", "max_sec": 60},
    "INSTAGRAM_REELS": {"aspect": "9:16", "max_sec": 60},
    "YOUTUBE_SHORTS": {"aspect": "9:16", "max_sec": 60},
}


def _energy_at(curve, t0, t1):
    vals = [p["energy"] for p in curve if t0 <= p["t"] < t1]
    return sum(vals) / len(vals) if vals else 0.0


def suggest_clips(analysis: dict[str, Any], duration: int, count: int = 3, platform: str = "TIKTOK") -> list[dict]:
    if duration not in ALLOWED_DURATIONS:
        raise ValueError(f"duration must be one of {ALLOWED_DURATIONS}")
    if platform not in PLATFORMS:
        raise ValueError(f"unknown platform {platform}")
    total = analysis["duration"]
    if duration > total:
        raise ValueError("Requested clip is longer than the song")
    curve, drops, sections = analysis["energy"], analysis.get("drops", []), analysis.get("sections", [])
    starts = sorted({0.0, *[s["start"] for s in sections], *[max(0.0, d["t"] - 2) for d in drops]})
    beats = analysis.get("beats") or []
    cands = []
    for st in starts:
        if st + duration > total:
            st = max(0.0, total - duration)
        if beats:  # snap to nearest beat
            st = min(beats, key=lambda b: abs(b - st))
            st = min(st, total - duration)
        en = st + duration
        score = _energy_at(curve, st, en)
        why = ["energy"]
        if any(st <= d["t"] < en for d in drops):
            score += 0.25
            why.append("beat drop")
        mid = st + duration / 2
        lab = next((s["label"] for s in sections if s["start"] <= mid < s["end"]), None)
        if lab == "chorus":
            score += 0.3
            why.append("chorus")
        cands.append({"start": round(st, 3), "end": round(en, 3), "score": round(score, 3), "reasons": why})
    cands.sort(key=lambda c: c["score"], reverse=True)
    picked: list[dict] = []
    for c in cands:
        if all(c["end"] <= p["start"] or c["start"] >= p["end"] for p in picked):
            picked.append({**c, "duration": duration, "platform": platform, **PLATFORMS[platform]})
        if len(picked) == count:
            break
    return picked
