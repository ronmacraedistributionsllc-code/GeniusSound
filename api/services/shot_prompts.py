"""Layered cinematography prompt builder (camera / movement / subject / lighting / style).

Origin: adapted from OpenMontage `lib/shot_prompt_builder.py` (MIT, Copyright (c) 2026
OpenMontage). Simplified and rewritten in Genius Sound's own vocabulary; the MIT notice is
reproduced in third_party/openmontage/NOTICE.md.
"""
from __future__ import annotations

from typing import Any

SHOT_SIZE = {"wide": "wide shot", "medium": "medium shot", "close_up": "close-up", "extreme_close_up": "extreme close-up",
             "establishing": "establishing shot", "over_shoulder": "over-the-shoulder shot", "insert": "insert detail shot"}
MOVEMENT = {"pan_left": "slow pan left", "pan_right": "slow pan right", "dolly_in": "slow dolly in", "dolly_out": "slow dolly out",
            "tracking": "tracking shot", "handheld": "handheld camera", "crane_up": "crane rising", "orbital": "orbiting camera",
            "zoom_in": "slow zoom in", "static": "locked-off camera"}
LIGHTING = {"golden_hour": "warm golden hour light", "neon": "neon light with colour spill", "low_key": "low-key dramatic lighting",
            "high_key": "bright high-key lighting", "silhouette": "backlit silhouette", "natural": "natural light"}


def build_shot_prompt(scene: dict[str, Any], style: dict[str, Any] | None = None) -> str:
    sl = scene.get("shot_language") or {}
    parts = []
    cam = [x for x in (f"{sl['lens_mm']}mm lens" if sl.get("lens_mm") else "",
                       SHOT_SIZE.get(sl.get("shot_size", ""), sl.get("shot_size", "")),
                       MOVEMENT.get(sl.get("camera_movement", ""), "") if sl.get("camera_movement") != "static" else "") if x]
    if cam:
        parts.append(", ".join(cam))
    subject = scene.get("description") or scene.get("prompt") or ""
    if scene.get("texture_keywords"):
        subject = f"{subject}, {', '.join(scene['texture_keywords'])}" if subject else ", ".join(scene["texture_keywords"])
    if subject:
        parts.append(subject)
    light = [x for x in (LIGHTING.get(sl.get("lighting_key", ""), sl.get("lighting_key", "")), sl.get("color_temperature", "")) if x]
    if light:
        parts.append(", ".join(light))
    if style and (style.get("aesthetic") or style.get("mood")):
        parts.append(f"Style: {style.get('aesthetic') or style.get('mood')}")
    return ". ".join(parts)
