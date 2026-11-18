"""Phase 6: provider abstraction. Real results or explicit errors — never fake output."""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Optional


class ProviderNotConfigured(Exception):
    """Required env vars / endpoint missing. Surface this to the user; do not fall back to fake output."""


class ProviderError(Exception):
    def __init__(self, message: str, retryable: bool = False, status_code: Optional[int] = None):
        super().__init__(message)
        self.retryable = retryable
        self.status_code = status_code


# Mirrors prisma enum GenerationStatus
QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED = "QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"


@dataclass
class GenerationRequest:
    kind: str  # "text_to_video" | "image_to_video" | "image" | "lip_sync"
    prompt: str
    image_url: Optional[str] = None  # reference / first-frame image (URL the provider can fetch)
    audio_url: Optional[str] = None
    duration_sec: Optional[float] = None
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class GenerationStatus:
    state: str  # QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELLED
    progress: float = 0.0  # 0..1 when known
    output_urls: list[str] = field(default_factory=list)  # only set when state == SUCCEEDED
    error: Optional[str] = None
    raw: dict[str, Any] = field(default_factory=dict)


class Provider(ABC):
    name: str = "base"
    kind: str = "VIDEO"  # prisma ProviderKind

    @abstractmethod
    def configured(self) -> bool: ...

    def require_configured(self) -> None:
        if not self.configured():
            raise ProviderNotConfigured(f"Provider '{self.name}' is not configured")

    @abstractmethod
    def submit(self, req: GenerationRequest) -> str:
        """Submit and return the provider's job id."""

    @abstractmethod
    def status(self, job_id: str) -> GenerationStatus: ...

    @abstractmethod
    def cancel(self, job_id: str) -> None: ...


def with_retry(fn: Callable[[], Any], attempts: int = 3, base_delay: float = 1.0,
               sleep: Callable[[float], None] = time.sleep) -> Any:
    """Retry only errors flagged retryable, with exponential backoff."""
    last: Optional[Exception] = None
    for i in range(attempts):
        try:
            return fn()
        except ProviderError as e:
            last = e
            if not e.retryable or i == attempts - 1:
                raise
            sleep(base_delay * (2 ** i))
    raise last  # pragma: no cover


def raise_for_http(resp) -> None:
    if resp.status_code < 400:
        return
    retry = resp.status_code in (408, 409, 425, 429) or resp.status_code >= 500
    raise ProviderError(f"HTTP {resp.status_code}: {resp.text[:300]}", retryable=retry, status_code=resp.status_code)
