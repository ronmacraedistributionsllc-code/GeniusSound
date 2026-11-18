"""Multi-take generate -> score -> pick-best selection.

Origin: workflow *pattern* from ComfyUI-OneShotMV (MIT code; its model stack is NOT used).
This is a clean-room implementation: scoring uses only approved, commercially-safe signals
(technical checks + optional caller-supplied scores). No SyncNet/S3FD, Qwen-Image 2.1,
InsightFace weights, or unlicensed LoRAs. See third_party/oneshotmv/NOTICE.md.
"""
from __future__ import annotations

from typing import Any

WEIGHTS = {"prompt_match": 0.35, "motion": 0.25, "sharpness": 0.2, "identity": 0.2}


def score_take(take: dict[str, Any]) -> float:
    """take: {id, scores:{prompt_match,motion,sharpness,identity: 0..1}, error?}. Missing signals are ignored
    and weights renormalised, so a take is never rewarded for data nobody measured."""
    if take.get("error"):
        return 0.0
    sc = take.get("scores") or {}
    used = {k: w for k, w in WEIGHTS.items() if isinstance(sc.get(k), (int, float))}
    if not used:
        return 0.0
    tot = sum(used.values())
    return round(sum(max(0.0, min(1.0, sc[k])) * w for k, w in used.items()) / tot, 4)


def pick_best(takes: list[dict[str, Any]], min_score: float = 0.0) -> dict[str, Any]:
    ranked = sorted(({"id": t.get("id"), "score": score_take(t)} for t in takes), key=lambda r: -r["score"])
    best = ranked[0] if ranked and ranked[0]["score"] > min_score else None
    return {"best": best["id"] if best else None, "ranking": ranked,
            "needs_review": best is None or (len(ranked) > 1 and best["score"] - ranked[1]["score"] < 0.03)}
