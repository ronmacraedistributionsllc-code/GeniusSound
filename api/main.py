"""Genius Sound media/AI service (Phase 1 skeleton).

Heavy work (analysis, generation, rendering) is added in later phases and is
always invoked by workers, not by browser requests.
"""
import shutil
import subprocess

from fastapi import FastAPI

from routes.api import router

app = FastAPI(title="Genius Sound API", version="0.1.0")
app.include_router(router)


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
