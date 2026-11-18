"""Endpoints exposing components derived from the research repos (see third_party/*/NOTICE.md)."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from routes.api import require_token, storage_root
from services import pacing, scenes, shot_prompts, takes

router = APIRouter(dependencies=[Depends(require_token)])


class DetectBody(BaseModel):
    storage_key: str
    detector: str = "adaptive"
    threshold: Optional[float] = None


@router.post("/scenes/detect")
def detect(body: DetectBody):
    p = (storage_root() / body.storage_key).resolve()
    if storage_root().resolve() not in p.parents:
        raise HTTPException(400, "Invalid storage_key")
    try:
        return {"scenes": scenes.detect_scenes(p, detector=body.detector, threshold=body.threshold)}
    except FileNotFoundError:
        raise HTTPException(404, "File not found")
    except scenes.SceneDetectUnavailable as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


class PacingBody(BaseModel):
    scenes: list[dict[str, Any]]
    sections: list[dict[str, Any]] = []
    beats: list[float] = []
    tolerance: float = 1.0


@router.post("/pacing/check")
def pacing_check(b: PacingBody):
    r = pacing.check_pacing(b.scenes, b.sections, b.beats, tolerance=b.tolerance)
    r["variation"] = pacing.check_variation(b.scenes)
    return r


class PromptBody(BaseModel):
    scene: dict[str, Any]
    style: Optional[dict[str, Any]] = None


@router.post("/prompts/shot")
def shot_prompt(b: PromptBody):
    return {"prompt": shot_prompts.build_shot_prompt(b.scene, b.style)}


class TakesBody(BaseModel):
    takes: list[dict[str, Any]]


@router.post("/takes/pick")
def pick(b: TakesBody):
    return takes.pick_best(b.takes)
