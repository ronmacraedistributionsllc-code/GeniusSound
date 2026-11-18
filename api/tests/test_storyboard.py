import pytest

from services.storyboard import StoryboardError, apply_action, new_scene, validate_timeline


def board():
    return [new_scene(i, description=f"s{i}", start=i * 10.0, end=i * 10.0 + 10) for i in range(3)]


def test_input_not_mutated_and_versions_append():
    b = board()
    n = apply_action(b, "edit", b[0]["id"], fields={"description": "new"})
    assert b[0]["fields"]["description"] == "s0" and len(b[0]["versions"]) == 1
    assert len(n[0]["versions"]) == 2 and n[0]["fields"]["description"] == "new"


def test_regenerate_never_overwrites_approved():
    b = board()
    sid = b[0]["id"]
    b = apply_action(b, "generation_result", sid, asset_url="u1")
    b = apply_action(b, "approve", sid)
    approved_v = b[0]["current_version_id"]
    b = apply_action(b, "request_regenerate", sid)
    b = apply_action(b, "generation_result", sid, asset_url="u2")
    assert b[0]["status"] == "APPROVED" and b[0]["current_version_id"] == approved_v
    cand = [v for v in b[0]["versions"] if v["candidate"]][0]
    assert cand["asset_url"] == "u2"
    b = apply_action(b, "promote_candidate", sid, version_id=cand["id"])
    assert b[0]["current_version_id"] == cand["id"] and b[0]["status"] == "PENDING_REVIEW"


def test_locked_scene_protected():
    b = board()
    sid = b[1]["id"]
    b = apply_action(b, "lock", sid)
    for act, kw in (("edit", {"fields": {"description": "x"}}), ("request_regenerate", {}), ("reject", {}), ("delete", {})):
        with pytest.raises(StoryboardError):
            apply_action(b, act, sid, **kw)
    with pytest.raises(StoryboardError):
        apply_action(b, "reorder", order=[b[1]["id"], b[0]["id"], b[2]["id"]])
    ok = apply_action(b, "reorder", order=[b[0]["id"], b[1]["id"], b[2]["id"]])
    assert [s["order"] for s in ok] == [0, 1, 2]


def test_empty_generation_result_refused():
    b = board()
    with pytest.raises(StoryboardError):
        apply_action(b, "generation_result", b[0]["id"], asset_url=None)


def test_restore_version_and_reorder():
    b = board()
    sid = b[0]["id"]
    b = apply_action(b, "edit", sid, fields={"description": "changed"})
    first = b[0]["versions"][0]["id"]
    b = apply_action(b, "restore_version", sid, version_id=first)
    assert b[0]["fields"]["description"] == "s0" and len(b[0]["versions"]) == 3
    r = apply_action(b, "reorder", order=[b[2]["id"], b[0]["id"], b[1]["id"]])
    assert r[0]["id"] == b[2]["id"] and r[0]["order"] == 0


def test_timeline_validation():
    b = board()
    assert validate_timeline(b, 30.0) == []
    b[1]["fields"]["start"] = 5.0
    assert any("overlaps" in i for i in validate_timeline(b, 30.0))
    assert any("no scene" in i for i in validate_timeline(board()[:2], 30.0))
