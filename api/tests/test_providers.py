import json

import httpx
import pytest

from providers.base import (FAILED, SUCCEEDED, GenerationRequest, ProviderError, ProviderNotConfigured, with_retry)
from providers.comfyui import ComfyUIProvider
from providers.fal import FalProvider
from providers.registry import get_provider, list_providers
from providers.replicate import ReplicateProvider

REQ = GenerationRequest(kind="text_to_video", prompt="neon street")


def client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_unconfigured_raises(monkeypatch):
    for v in ("COMFYUI_URL", "COMFYUI_WORKFLOW_ID", "REPLICATE_API_TOKEN", "FAL_KEY"):
        monkeypatch.delenv(v, raising=False)
    with pytest.raises(ProviderNotConfigured):
        get_provider("comfyui")
    assert all(not p["configured"] for p in list_providers())
    with pytest.raises(ProviderNotConfigured):
        ReplicateProvider(token="", model_version="").submit(REQ)


def test_comfy_flow(tmp_path):
    wf = tmp_path / "wf.json"
    wf.write_text(json.dumps({"1": {"inputs": {"text": "{{prompt}}"}}}))
    seen = {}

    def h(request):
        if request.url.path == "/prompt":
            seen["graph"] = json.loads(request.content)["prompt"]
            return httpx.Response(200, json={"prompt_id": "abc"})
        if request.url.path == "/history/abc":
            return httpx.Response(200, json={"abc": {"status": {"status_str": "success"},
                                                      "outputs": {"9": {"videos": [{"filename": "a.mp4", "subfolder": "", "type": "output"}]}}}})
        return httpx.Response(404)

    p = ComfyUIProvider("http://c:8188", str(wf), client(h))
    jid = p.submit(REQ)
    assert seen["graph"]["1"]["inputs"]["text"] == "neon street"
    st = p.status(jid)
    assert st.state == SUCCEEDED and st.output_urls[0].endswith("filename=a.mp4&subfolder=&type=output")


def test_comfy_no_output_is_failure(tmp_path):
    wf = tmp_path / "wf.json"
    wf.write_text("{}")
    h = lambda r: httpx.Response(200, json={"x": {"status": {"status_str": "success"}, "outputs": {}}})
    st = ComfyUIProvider("http://c", str(wf), client(h)).status("x")
    assert st.state == FAILED and not st.output_urls


def test_replicate_flow():
    def h(r):
        if r.method == "POST":
            return httpx.Response(201, json={"id": "p1"})
        return httpx.Response(200, json={"status": "succeeded", "output": ["https://x/v.mp4"]})

    p = ReplicateProvider("tok", "ver", client(h))
    assert p.status(p.submit(REQ)).output_urls == ["https://x/v.mp4"]


def test_fal_flow():
    def h(r):
        if r.method == "POST":
            return httpx.Response(200, json={"request_id": "r1"})
        if r.url.path.endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        return httpx.Response(200, json={"video": {"url": "https://f/v.mp4"}})

    p = FalProvider("k", "fal-ai/model", client(h))
    assert p.status(p.submit(REQ)).output_urls == ["https://f/v.mp4"]


def test_retry_only_retryable():
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise ProviderError("busy", retryable=True)
        return "ok"

    assert with_retry(flaky, sleep=lambda s: None) == "ok" and calls["n"] == 3
    calls["n"] = 0

    def fatal():
        calls["n"] += 1
        raise ProviderError("bad input", retryable=False)

    with pytest.raises(ProviderError):
        with_retry(fatal, sleep=lambda s: None)
    assert calls["n"] == 1


def test_http_5xx_retryable():
    h = lambda r: httpx.Response(503, text="down")
    with pytest.raises(ProviderError) as e:
        ReplicateProvider("t", "v", client(h)).submit(REQ)
    assert e.value.retryable
