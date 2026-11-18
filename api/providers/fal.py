"""fal.ai queue adapter. Written to fal's documented queue API; not yet exercised against the live service."""
from __future__ import annotations

import os
from typing import Optional

import httpx

from .base import (CANCELLED, FAILED, QUEUED, RUNNING, SUCCEEDED, GenerationRequest, GenerationStatus,
                   Provider, ProviderError, raise_for_http)

QUEUE = "https://queue.fal.run"


class FalProvider(Provider):
    name = "fal"

    def __init__(self, key: Optional[str] = None, model_id: Optional[str] = None,
                 client: Optional[httpx.Client] = None):
        self.key = key if key is not None else os.getenv("FAL_KEY", "")
        self.model_id = model_id if model_id is not None else os.getenv("FAL_MODEL_ID", "")
        self.client = client or httpx.Client(timeout=30)

    def configured(self) -> bool:
        return bool(self.key and self.model_id)

    def _h(self):
        return {"Authorization": f"Key {self.key}"}

    def submit(self, req: GenerationRequest) -> str:
        self.require_configured()
        body = {"prompt": req.prompt, **req.params}
        if req.image_url:
            body["image_url"] = req.image_url
        if req.audio_url:
            body["audio_url"] = req.audio_url
        try:
            r = self.client.post(f"{QUEUE}/{self.model_id}", headers=self._h(), json=body)
        except httpx.HTTPError as e:
            raise ProviderError(f"fal unreachable: {e}", retryable=True)
        raise_for_http(r)
        return r.json()["request_id"]

    def status(self, job_id: str) -> GenerationStatus:
        self.require_configured()
        base = f"{QUEUE}/{self.model_id}/requests/{job_id}"
        try:
            r = self.client.get(f"{base}/status", headers=self._h())
            raise_for_http(r)
            s = r.json().get("status")
            if s == "IN_QUEUE":
                return GenerationStatus(QUEUED, raw=r.json())
            if s != "COMPLETED":
                return GenerationStatus(RUNNING, raw=r.json())
            res = self.client.get(base, headers=self._h())
            raise_for_http(res)
        except httpx.HTTPError as e:
            raise ProviderError(f"fal unreachable: {e}", retryable=True)
        j = res.json()
        urls = []
        v = j.get("video")
        if isinstance(v, dict) and v.get("url"):
            urls.append(v["url"])
        for im in j.get("images", []) or []:
            if isinstance(im, dict) and im.get("url"):
                urls.append(im["url"])
        if not urls:
            return GenerationStatus(FAILED, error="fal request completed with no media output", raw=j)
        return GenerationStatus(SUCCEEDED, 1.0, urls, raw=j)

    def cancel(self, job_id: str) -> None:
        self.require_configured()
        raise_for_http(self.client.put(f"{QUEUE}/{self.model_id}/requests/{job_id}/cancel", headers=self._h()))
