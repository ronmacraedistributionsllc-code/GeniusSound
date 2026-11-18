"""Replicate adapter. Written to Replicate's documented predictions API; not yet exercised against the live service."""
from __future__ import annotations

import os
from typing import Optional

import httpx

from .base import (CANCELLED, FAILED, QUEUED, RUNNING, SUCCEEDED, GenerationRequest, GenerationStatus,
                   Provider, ProviderError, raise_for_http)

API = "https://api.replicate.com/v1"


class ReplicateProvider(Provider):
    name = "replicate"

    def __init__(self, token: Optional[str] = None, model_version: Optional[str] = None,
                 client: Optional[httpx.Client] = None):
        self.token = token if token is not None else os.getenv("REPLICATE_API_TOKEN", "")
        self.model_version = model_version if model_version is not None else os.getenv("REPLICATE_MODEL_VERSION", "")
        self.client = client or httpx.Client(timeout=30)

    def configured(self) -> bool:
        return bool(self.token and self.model_version)

    def _h(self):
        return {"Authorization": f"Bearer {self.token}"}

    def submit(self, req: GenerationRequest) -> str:
        self.require_configured()
        inp = {"prompt": req.prompt, **req.params}
        if req.image_url:
            inp["image"] = req.image_url
        if req.audio_url:
            inp["audio"] = req.audio_url
        try:
            r = self.client.post(f"{API}/predictions", headers=self._h(),
                                 json={"version": self.model_version, "input": inp})
        except httpx.HTTPError as e:
            raise ProviderError(f"Replicate unreachable: {e}", retryable=True)
        raise_for_http(r)
        return r.json()["id"]

    def status(self, job_id: str) -> GenerationStatus:
        self.require_configured()
        try:
            r = self.client.get(f"{API}/predictions/{job_id}", headers=self._h())
        except httpx.HTTPError as e:
            raise ProviderError(f"Replicate unreachable: {e}", retryable=True)
        raise_for_http(r)
        j = r.json()
        s = j.get("status")
        if s == "succeeded":
            out = j.get("output")
            urls = [out] if isinstance(out, str) else list(out or [])
            if not urls:
                return GenerationStatus(FAILED, error="Prediction succeeded but returned no output", raw=j)
            return GenerationStatus(SUCCEEDED, 1.0, urls, raw=j)
        if s in ("failed",):
            return GenerationStatus(FAILED, error=str(j.get("error")), raw=j)
        if s == "canceled":
            return GenerationStatus(CANCELLED, raw=j)
        return GenerationStatus(QUEUED if s == "starting" else RUNNING, raw=j)

    def cancel(self, job_id: str) -> None:
        self.require_configured()
        raise_for_http(self.client.post(f"{API}/predictions/{job_id}/cancel", headers=self._h()))
