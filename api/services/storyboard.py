"""Phase 5: storyboard rules as a stateless state machine.

The Next.js app owns persistence: it sends the current scene list + an action, gets the new
scene list back, and saves it. Rules enforced here:
  * versions are append-only (history never lost)
  * locked scenes cannot be edited, regenerated, replaced, rejected or moved
  * regenerating an APPROVED scene never overwrites it: the new result is a candidate version
    and the approved version stays current until the user explicitly promotes the candidate
Scene statuses mirror prisma enum SceneStatus.
"""
from __future__ import annotations

import copy
import uuid
from typing import Any, Optional

EDITABLE_FIELDS = {"description", "lyrics", "location", "camera", "lighting", "start", "end", "characters", "wardrobe", "props"}


class StoryboardError(ValueError):
    pass


def _vid() -> str:
    return uuid.uuid4().hex[:12]


def new_scene(order: int, **fields: Any) -> dict:
    v = {"id": _vid(), "number": 1, "kind": "edit", "fields": dict(fields), "asset_url": None, "candidate": False}
    return {"id": _vid(), "order": order, "status": "DRAFT", "locked": False, "fields": dict(fields),
            "current_version_id": v["id"], "versions": [v]}


def _find(scenes: list[dict], scene_id: str) -> dict:
    for s in scenes:
        if s["id"] == scene_id:
            return s
    raise StoryboardError(f"Scene {scene_id} not found")


def _guard_unlocked(s: dict, what: str) -> None:
    if s["locked"]:
        raise StoryboardError(f"Scene is locked; unlock it before you {what}")


def _add_version(s: dict, kind: str, fields: dict, asset_url: Optional[str] = None, candidate: bool = False) -> dict:
    v = {"id": _vid(), "number": len(s["versions"]) + 1, "kind": kind, "fields": dict(fields),
         "asset_url": asset_url, "candidate": candidate}
    s["versions"].append(v)
    return v


def _renumber(scenes: list[dict]) -> None:
    for i, s in enumerate(scenes):
        s["order"] = i


def apply_action(scenes: list[dict], action: str, scene_id: Optional[str] = None, **kw: Any) -> list[dict]:
    """Return a NEW scene list with the action applied; the input is never mutated."""
    sc = copy.deepcopy(scenes)
    if action == "reorder":
        ids = kw["order"]
        if sorted(ids) != sorted(s["id"] for s in sc):
            raise StoryboardError("Reorder must list every scene exactly once")
        pos = {s["id"]: s["order"] for s in sc}
        for new_i, sid in enumerate(ids):
            if _find(sc, sid)["locked"] and pos[sid] != new_i:
                raise StoryboardError("Locked scenes cannot be moved")
        by = {s["id"]: s for s in sc}
        sc = [by[i] for i in ids]
        _renumber(sc)
        return sc

    s = _find(sc, scene_id) if scene_id else None
    if action == "add":
        sc.append(new_scene(len(sc), **kw.get("fields", {})))
        _renumber(sc)
        return sc
    if s is None:
        raise StoryboardError("scene_id required")

    if action == "edit":
        _guard_unlocked(s, "edit it")
        bad = set(kw["fields"]) - EDITABLE_FIELDS
        if bad:
            raise StoryboardError(f"Unknown fields: {sorted(bad)}")
        s["fields"].update(kw["fields"])
        v = _add_version(s, "edit", s["fields"], asset_url=_current(s).get("asset_url"))
        s["current_version_id"] = v["id"]
        if s["status"] == "APPROVED":
            s["status"] = "PENDING_REVIEW"  # edited content must be re-approved
    elif action == "approve":
        if s["status"] not in ("GENERATED", "PENDING_REVIEW", "DRAFT", "REJECTED"):
            raise StoryboardError(f"Cannot approve a scene that is {s['status']}")
        s["status"] = "APPROVED"
    elif action == "reject":
        _guard_unlocked(s, "reject it")
        s["status"] = "REJECTED"
    elif action == "lock":
        s["locked"] = True
    elif action == "unlock":
        s["locked"] = False
    elif action == "request_regenerate":
        _guard_unlocked(s, "regenerate it")
        if s["status"] == "GENERATING":
            raise StoryboardError("Generation already in progress")
        s["pending_regeneration"] = True
        if s["status"] != "APPROVED":  # approved scenes stay approved until a candidate is promoted
            s["status"] = "GENERATING"
    elif action == "generation_result":
        asset = kw.get("asset_url")
        if not asset:
            raise StoryboardError("A generation result needs a real asset_url; refusing to record an empty result")
        approved = s["status"] == "APPROVED"
        v = _add_version(s, "generation", s["fields"], asset_url=asset, candidate=approved)
        s.pop("pending_regeneration", None)
        if approved:
            pass  # approved version stays current; candidate waits for promotion
        else:
            s["current_version_id"] = v["id"]
            s["status"] = "GENERATED"
    elif action == "generation_failed":
        s.pop("pending_regeneration", None)
        if s["status"] == "GENERATING":
            s["status"] = "FAILED"
    elif action == "promote_candidate":
        _guard_unlocked(s, "replace its approved version")
        v = next((x for x in s["versions"] if x["id"] == kw["version_id"] and x["candidate"]), None)
        if not v:
            raise StoryboardError("Candidate version not found")
        v["candidate"] = False
        s["current_version_id"] = v["id"]
        s["status"] = "PENDING_REVIEW"
    elif action == "restore_version":
        _guard_unlocked(s, "restore a version")
        v = next((x for x in s["versions"] if x["id"] == kw["version_id"]), None)
        if not v:
            raise StoryboardError("Version not found")
        s["fields"] = dict(v["fields"])
        nv = _add_version(s, "restore", v["fields"], asset_url=v["asset_url"])
        s["current_version_id"] = nv["id"]
        if s["status"] == "APPROVED":
            s["status"] = "PENDING_REVIEW"
    elif action == "replace_asset":
        _guard_unlocked(s, "replace its media")
        if not kw.get("asset_url"):
            raise StoryboardError("asset_url required")
        nv = _add_version(s, "replace", s["fields"], asset_url=kw["asset_url"])
        s["current_version_id"] = nv["id"]
        s["status"] = "PENDING_REVIEW"
    elif action == "delete":
        _guard_unlocked(s, "delete it")
        sc = [x for x in sc if x["id"] != scene_id]
        _renumber(sc)
    else:
        raise StoryboardError(f"Unknown action '{action}'")
    return sc


def _current(s: dict) -> dict:
    return next(v for v in s["versions"] if v["id"] == s["current_version_id"])


def validate_timeline(scenes: list[dict], song_duration: float, tolerance: float = 0.05) -> list[str]:
    """Return human-readable problems: overlaps, gaps, scenes past the song end."""
    issues = []
    timed = sorted((s for s in scenes if "start" in s["fields"] and "end" in s["fields"]), key=lambda s: s["fields"]["start"])
    prev_end = 0.0
    for s in timed:
        a, b = s["fields"]["start"], s["fields"]["end"]
        if b <= a:
            issues.append(f"Scene {s['order'] + 1}: end must be after start")
        if a < prev_end - tolerance:
            issues.append(f"Scene {s['order'] + 1} overlaps the previous scene")
        elif a > prev_end + tolerance:
            issues.append(f"Gap of {a - prev_end:.1f}s before scene {s['order'] + 1}")
        if b > song_duration + tolerance:
            issues.append(f"Scene {s['order'] + 1} runs past the end of the song")
        prev_end = max(prev_end, b)
    if timed and prev_end < song_duration - tolerance:
        issues.append(f"Last {song_duration - prev_end:.1f}s of the song has no scene")
    return issues
