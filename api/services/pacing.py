"""Pacing verification: do the visuals change where the music changes?

Origin: concept from OpenMontage `lib/verify_scene_pacing.py` and `variation_checker.py`
(MIT, Copyright (c) 2026 OpenMontage). Re-implemented for music videos (song sections /
beats instead of narration cues); no code copied. See third_party/openmontage/NOTICE.md.
"""
from __future__ import annotations

from typing import Any


def check_pacing(scenes: list[dict[str, Any]], sections: list[dict[str, Any]] | None = None,
                 beats: list[float] | None = None, *, tolerance: float = 1.0,
                 max_scene_sec: float = 12.0, min_scene_sec: float = 0.8) -> dict[str, Any]:
    """scenes: [{start,end,...}] ; sections: [{start,end,label}] ; beats: seconds.
    Returns {ok, issues[], stats}. Never raises."""
    issues: list[dict[str, Any]] = []
    ss = sorted(scenes, key=lambda s: s["start"])
    for i, s in enumerate(ss):
        d = s["end"] - s["start"]
        if d > max_scene_sec:
            issues.append({"type": "too_long", "scene": i, "detail": f"{d:.1f}s > {max_scene_sec}s (slideshow/static risk)"})
        if d < min_scene_sec:
            issues.append({"type": "too_short", "scene": i, "detail": f"{d:.2f}s < {min_scene_sec}s"})
        if i and s["start"] - ss[i - 1]["end"] > 0.05:
            issues.append({"type": "gap", "scene": i, "detail": f"{s['start'] - ss[i-1]['end']:.2f}s gap"})
        if i and s["start"] < ss[i - 1]["end"] - 0.05:
            issues.append({"type": "overlap", "scene": i, "detail": "overlaps previous scene"})
    starts = [s["start"] for s in ss]
    for sec in sections or []:
        near = min((abs(t - sec["start"]) for t in starts), default=None)
        if near is None or near > tolerance:
            issues.append({"type": "section_unmatched", "section": sec.get("label", "?"),
                           "detail": f"no scene cut within ±{tolerance}s of {sec['start']:.1f}s"})
    off_beat = 0
    if beats:
        for t in starts:
            if min(abs(t - b) for b in beats) > 0.15:
                off_beat += 1
    return {"ok": not issues, "issues": issues,
            "stats": {"scenes": len(ss), "off_beat_cuts": off_beat,
                      "avg_scene_sec": round(sum(s["end"] - s["start"] for s in ss) / len(ss), 2) if ss else 0}}


def check_variation(scenes: list[dict[str, Any]]) -> dict[str, Any]:
    """Flag consecutive scenes with identical shot size/camera movement (visual monotony)."""
    issues = []
    for i in range(1, len(scenes)):
        a, b = scenes[i - 1].get("shot_language", {}), scenes[i].get("shot_language", {})
        if a and a.get("shot_size") == b.get("shot_size") and a.get("camera_movement") == b.get("camera_movement"):
            issues.append({"scene": i, "detail": f"same shot_size/camera_movement as scene {i-1}"})
    return {"ok": not issues, "issues": issues}
