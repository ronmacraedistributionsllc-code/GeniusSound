"""ComfyUI adapter (self-hosted or cloud GPU). Talks HTTP only — no ComfyUI code is linked.

`workflow_path` points to an API-format workflow JSON authored for Genius Sound using
approved models only (see docs/LICENSING_AUDIT.md). String values of the exact form
"{{prompt}}", "{{image}}", "{{audio}}", "{{duration}}" are substituted.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

import httpx

from .base import (CANCELLED, FAILED, QUEUED, RUNNING, SUCCEEDED, GenerationRequest, GenerationStatus,
                   Provider, ProviderError, raise_for_http)


def _subst(node: Any, mapping: dict[str, Any]) -> Any:
    if isinstance(node, dict):
        return {k: _subst(v, mapping) for k, v in node.items()}
    if isinstance(node, list):
        return [_subst(v, mapping) for v in node]
    if isinstance(node, str) and node in mapping:
        return mapping[node]
    return node


class ComfyUIProvider(Provider):
    name = "comfyui"

    def __init__(self, base_url: Optional[str] = None, workflow_path: Optional[str] = None,
                 client: Optional[httpx.Client] = None):
        self.base_url = (base_url if base_url is not None else os.getenv("COMFYUI_URL", "")).rstrip("/")
        self.workflow_path = workflow_path if workflow_path is not None else os.getenv("COMFYUI_WORKFLOW_ID", "")
        self.client = client or httpx.Client(timeout=30)

    def configured(self) -> bool:
        return bool(self.base_url and self.workflow_path and Path(self.workflow_path).is_file())

    def _graph(self, req: GenerationRequest) -> dict:
        wf = json.loads(Path(self.workflow_path).read_text())
        return _subst(wf, {"{{prompt}}": req.prompt, "{{image}}": req.image_url or "",
                           "{{audio}}": req.audio_url or "", "{{duration}}": req.duration_sec or 0})

    def submit(self, req: GenerationRequest) -> str:
        self.require_configured()
        try:
            r = self.client.post(f"{self.base_url}/prompt", json={"prompt": self._graph(req)})
        except httpx.HTTPError as e:
            raise ProviderError(f"ComfyUI unreachable: {e}", retryable=True)
        raise_for_http(r)
        body = r.json()
        if body.get("node_errors"):
            raise ProviderError(f"ComfyUI rejected workflow: {body['node_errors']}")
        return body["prompt_id"]

    def status(self, job_id: str) -> GenerationStatus:
        self.require_configured()
        try:
            h = self.client.get(f"{self.base_url}/history/{job_id}")
            raise_for_http(h)
            hist = h.json().get(job_id)
            if hist is None:
                q = self.client.get(f"{self.base_url}/queue")
                raise_for_http(q)
                qj = q.json()
                running = any(job_id in str(x) for x in qj.get("queue_running", []))
                return GenerationStatus(RUNNING if running else QUEUED, raw=qj)
        except httpx.HTTPError as e:
            raise ProviderError(f"ComfyUI unreachable: {e}", retryable=True)
        st = hist.get("status", {})
        if st.get("status_str") == "error":
            return GenerationStatus(FAILED, error=json.dumps(st.get("messages", []))[:500], raw=hist)
        urls = []
        for out in hist.get("outputs", {}).values():
            for key in ("videos", "gifs", "images"):
                for f in out.get(key, []):
                    urls.append(f"{self.base_url}/view?filename={f['filename']}&subfolder={f.get('subfolder', '')}&type={f.get('type', 'output')}")
        if not urls:
            return GenerationStatus(FAILED, error="Workflow finished but produced no output files", raw=hist)
        return GenerationStatus(SUCCEEDED, 1.0, urls, raw=hist)

    def cancel(self, job_id: str) -> None:
        self.require_configured()
        self.client.post(f"{self.base_url}/queue", json={"delete": [job_id]})
        self.client.post(f"{self.base_url}/interrupt")
