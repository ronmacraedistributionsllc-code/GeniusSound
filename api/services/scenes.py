"""Shot / scene boundary detection.

Origin: PySceneDetect (BSD-3-Clause, https://github.com/Breakthrough/PySceneDetect),
used UNMODIFIED as a pip dependency (`scenedetect`, `opencv-python-headless`).
No PySceneDetect source is vendored. See third_party/pyscenedetect/NOTICE.md.

Genius Sound uses it to (a) find real cuts inside generated/uploaded clips so
assembly can trim dead frames, and (b) snap storyboard/promo boundaries to cuts.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any


class SceneDetectUnavailable(RuntimeError):
    pass


def detect_scenes(path: str | Path, *, detector: str = "adaptive", threshold: float | None = None,
                  min_scene_sec: float = 0.6) -> list[dict[str, Any]]:
    try:
        from scenedetect import detect, AdaptiveDetector, ContentDetector, ThresholdDetector
    except Exception as e:  # pragma: no cover
        raise SceneDetectUnavailable(f"scenedetect not installed: {e}") from e
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(str(p))
    kw: dict[str, Any] = {}
    if detector == "content":
        det = ContentDetector(**({"threshold": threshold} if threshold else {}), min_scene_len=15)
    elif detector == "threshold":
        det = ThresholdDetector(**({"threshold": threshold} if threshold else {}), min_scene_len=15)
    elif detector == "adaptive":
        det = AdaptiveDetector(**({"adaptive_threshold": threshold} if threshold else {}), min_scene_len=15)
    else:
        raise ValueError(f"unknown detector {detector!r}")
    scenes = detect(str(p), det, **kw)
    out = [{"index": i, "start": round(s.seconds, 3), "end": round(e.seconds, 3),
            "duration": round(e.seconds - s.seconds, 3)} for i, (s, e) in enumerate(scenes)]
    return _merge_short(out, min_scene_sec)


def _merge_short(scenes: list[dict[str, Any]], min_sec: float) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    for s in scenes:
        if merged and s["duration"] < min_sec:
            merged[-1]["end"] = s["end"]
            merged[-1]["duration"] = round(merged[-1]["end"] - merged[-1]["start"], 3)
        else:
            merged.append(dict(s))
    for i, s in enumerate(merged):
        s["index"] = i
    return merged


def snap_to_cuts(times: list[float], cuts: list[float], tolerance: float = 0.5) -> list[float]:
    """Move each time to the nearest detected cut within tolerance (else unchanged)."""
    out = []
    for t in times:
        best = min(cuts, key=lambda c: abs(c - t), default=None)
        out.append(round(best, 3) if best is not None and abs(best - t) <= tolerance else t)
    return out
