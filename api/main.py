"""Genius Sound media/AI service (Phase 1 skeleton).

Heavy work (analysis, generation, rendering) is added in later phases and is
always invoked by workers, not by browser requests.
"""
import os
import shutil
import subprocess
from pathlib import Path


def _load_env() -> None:
    """Load ../.env (without overriding real env vars) so the API works however it is started."""
    root = Path(__file__).resolve().parent.parent
    f = root / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip()
            if v[:1] in "\"'" and v.count(v[0]) >= 2:
                v = v[1:v.index(v[0], 1)]
            else:
                v = v.split(" #")[0].strip()
            os.environ.setdefault(k.strip(), v)
    sr = os.environ.get("STORAGE_LOCAL_ROOT")
    if sr and not os.path.isabs(sr):
        os.environ["STORAGE_LOCAL_ROOT"] = str((root / sr).resolve())


_load_env()

from fastapi import FastAPI

from routes.api import router
from routes.research import router as research_router

app = FastAPI(title="Genius Sound API", version="0.1.0")
app.include_router(router)
app.include_router(research_router)


def _ffmpeg_info() -> dict:
    path = shutil.which("ffmpeg")
    if not path:
        return {"available": False}
    out = subprocess.run([path, "-version"], capture_output=True, text=True, timeout=10).stdout
    first = out.splitlines()[0] if out else ""
    conf = next((l for l in out.splitlines() if l.startswith("configuration:")), "")
    return {
        "available": True,
        "version": first,
        "gpl_build": "--enable-gpl" in conf,
        "nonfree_build": "--enable-nonfree" in conf,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "genius-sound-api", "ffmpeg": _ffmpeg_info()}
