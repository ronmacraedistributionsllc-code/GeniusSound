import json

import httpx
import pytest

from providers.base import ProviderError, ProviderNotConfigured
from services.creative_director import LLM, generate_concepts, generate_storyboard, normalize_scenes

AN = {"duration": 60.0, "bpm": 100, "key": {"key": "A minor"},
      "sections": [{"label": "intro", "start": 0, "end": 10, "energy": .2}, {"label": "chorus", "start": 10, "end": 60, "energy": .9}],
      "drops": [{"t": 10.0, "intensity": .7}]}
SCENE = {"start": 0, "end": 5, "description": "d", "location": "l", "camera_angle": "low", "camera_movement": "dolly", "lighting": "neon"}


def llm_returning(*contents):
    it = iter(contents)
    seen = []

    def h(req):
        seen.append(json.loads(req.content))
        return httpx.Response(200, json={"choices": [{"message": {"content": next(it)}}]})

    return LLM("http://llm/v1", "", "qwen", httpx.Client(transport=httpx.MockTransport(h))), seen


def test_unconfigured_raises(monkeypatch):
    for v in ("LLM_BASE_URL", "LLM_MODEL", "OPENAI_API_KEY"):
        monkeypatch.delenv(v, raising=False)
    with pytest.raises(ProviderNotConfigured):
        generate_concepts(LLM(), AN)


def test_concepts_with_fenced_json():
    c = {"concepts": [{"title": "T", "logline": "L", "mood": "m", "visual_style": "v"}]}
    llm, seen = llm_returning("```json\n" + json.dumps(c) + "\n```")
    out = generate_concepts(llm, AN, "la la", "make it gritty", 1)
    assert out[0]["title"] == "T"
    prompt = seen[0]["messages"][1]["content"]
    assert "100 BPM" in prompt and "make it gritty" in prompt and "chorus" in prompt


def test_repair_loop_then_success_and_failure():
    good = json.dumps({"scenes": [SCENE]})
    llm, seen = llm_returning("not json at all", good)
    assert generate_storyboard(llm, AN, {"title": "T"})[0]["number"] == 1
    assert "invalid" in seen[1]["messages"][-1]["content"]
    llm, _ = llm_returning("nope", "still nope")
    with pytest.raises(ProviderError):
        generate_storyboard(llm, AN, {"title": "T"})


def test_normalize_makes_gapless_in_bounds():
    raw = [{**SCENE, "start": 2, "end": 8}, {**SCENE, "start": 20, "end": 90}, {**SCENE, "start": 70, "end": 80}]
    out = normalize_scenes(raw, 60.0)
    assert out[0]["start"] == 0.0 and out[-1]["end"] == 60.0
    for a, b in zip(out, out[1:]):
        assert a["end"] == b["start"]
    assert [s["number"] for s in out] == list(range(1, len(out) + 1))
