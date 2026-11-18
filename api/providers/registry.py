from __future__ import annotations

from .base import Provider, ProviderNotConfigured
from .comfyui import ComfyUIProvider
from .fal import FalProvider
from .replicate import ReplicateProvider

_ALL = {"comfyui": ComfyUIProvider, "replicate": ReplicateProvider, "fal": FalProvider}


def get_provider(name: str) -> Provider:
    if name not in _ALL:
        raise KeyError(f"Unknown provider '{name}'")
    p = _ALL[name]()
    p.require_configured()
    return p


def list_providers() -> list[dict]:
    out = []
    for n, cls in _ALL.items():
        p = cls()
        out.append({"name": n, "kind": p.kind, "configured": p.configured()})
    return out
