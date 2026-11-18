"""Phase 9: FFmpeg assembly. Runs ffmpeg as a subprocess (never linked).

Builds one command that scales/crops every clip to the target frame, joins them with
crossfades, lays the song underneath and encodes H.264/AAC.
"""
from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

FORMATS = {  # (aspect, quality) -> (w, h)
    ("16:9", "1080p"): (1920, 1080), ("16:9", "4k"): (3840, 2160),
    ("9:16", "1080p"): (1080, 1920), ("9:16", "4k"): (2160, 3840),
    ("1:1", "1080p"): (1080, 1080), ("1:1", "4k"): (2160, 2160),
}
TRANSITIONS = {"fade", "fadeblack", "wipeleft", "slideleft", "dissolve", "none"}


@dataclass
class Clip:
    path: str
    duration: float  # seconds of this clip to use (trimmed from start)


def probe_duration(path: str) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {out.stderr.strip()[:200]}")
    return float(out.stdout.strip())


def build_command(clips: list[Clip], audio: Optional[str], out: str, aspect: str = "16:9", quality: str = "1080p",
                  transition: str = "fade", transition_sec: float = 0.5, fps: int = 30, preview: bool = False,
                  subtitles: Optional[str] = None) -> list[str]:
    if not clips:
        raise ValueError("No clips to assemble")
    if (aspect, quality) not in FORMATS:
        raise ValueError(f"Unsupported format {aspect} {quality}")
    if transition not in TRANSITIONS:
        raise ValueError(f"Unsupported transition {transition}")
    w, h = FORMATS[(aspect, quality)]
    if preview:
        w, h = w // 2, h // 2
        w, h = w - w % 2, h - h % 2
    t = 0.0 if transition == "none" else transition_sec
    for c in clips:
        if c.duration <= t * 2 and len(clips) > 1:
            raise ValueError("A clip is shorter than its transitions")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-nostats", "-progress", "pipe:1"]
    for c in clips:
        cmd += ["-t", f"{c.duration:.3f}", "-i", c.path]
    if audio:
        cmd += ["-i", audio]
    parts = []
    for i in range(len(clips)):
        # hold the last frame if a generated clip is shorter than its scene, then cut to the exact scene length
        parts.append(f"[{i}:v]tpad=stop_mode=clone:stop_duration={clips[i].duration:.3f},trim=duration={clips[i].duration:.3f},setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={fps},format=yuv420p[v{i}]")
    label, total = "v0", clips[0].duration
    for i in range(1, len(clips)):
        nxt = f"x{i}"
        if t > 0:
            parts.append(f"[{label}][v{i}]xfade=transition={transition}:duration={t}:offset={total - t:.3f}[{nxt}]")
            total += clips[i].duration - t
        else:
            parts.append(f"[{label}][v{i}]concat=n=2:v=1:a=0[{nxt}]")
            total += clips[i].duration
        label = nxt
    if subtitles:
        esc = subtitles.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        parts.append(f"[{label}]subtitles='{esc}'[vs]")
        label = "vs"
    cmd += ["-filter_complex", ";".join(parts), "-map", f"[{label}]"]
    if audio:
        cmd += ["-map", f"{len(clips)}:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    crf, preset = ("30", "veryfast") if preview else ("18", "medium")
    cmd += ["-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    return cmd


def run(cmd: list[str], total_sec: float, on_progress: Optional[Callable[[float], None]] = None, timeout: int = 3600) -> None:
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is not installed")
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        for line in p.stdout:  # type: ignore[union-attr]
            m = re.match(r"out_time_us=(\d+)", line)
            if m and on_progress and total_sec > 0:
                on_progress(min(1.0, int(m.group(1)) / 1e6 / total_sec))
        _, err = p.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        p.kill()
        raise RuntimeError("ffmpeg timed out")
    if p.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {err[-500:]}")
    if on_progress:
        on_progress(1.0)


def assemble(clips: list[Clip], audio: Optional[str], out: str,
             on_progress: Optional[Callable[[float], None]] = None, **kw) -> dict:
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    cmd = build_command(clips, audio, out, **kw)
    t = 0.0 if kw.get("transition", "fade") == "none" else kw.get("transition_sec", 0.5)
    total = sum(c.duration for c in clips) - t * (len(clips) - 1)
    run(cmd, total, on_progress)
    return {"output": out, "duration": probe_duration(out)}


def lyric_video_command(background: Optional[str], audio: str, ass: str, out: str, duration: float,
                        aspect: str = "16:9", quality: str = "1080p", bg_color: str = "#0b0b12", fps: int = 30,
                        preview: bool = False, audio_start: float = 0.0) -> list[str]:
    """Lyric video: looped background image/video (or solid colour) + song + burned-in ASS karaoke."""
    if (aspect, quality) not in FORMATS:
        raise ValueError(f"Unsupported format {aspect} {quality}")
    if duration <= 0:
        raise ValueError("duration must be positive")
    w, h = FORMATS[(aspect, quality)]
    if preview:
        w, h = (w // 2) - (w // 2) % 2, (h // 2) - (h // 2) % 2
    cmd = ["ffmpeg", "-y", "-hide_banner", "-nostats", "-progress", "pipe:1"]
    if background:
        is_img = Path(background).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        cmd += (["-loop", "1"] if is_img else ["-stream_loop", "-1"]) + ["-t", f"{duration:.3f}", "-i", background]
    else:
        cmd += ["-f", "lavfi", "-i", f"color=c={bg_color.lstrip('#')}:s={w}x{h}:d={duration:.3f}:r={fps}"]
    cmd += (["-ss", f"{audio_start:.3f}"] if audio_start > 0 else []) + ["-i", audio]
    esc = ass.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={fps},ass='{esc}',format=yuv420p"
    crf, preset = ("30", "veryfast") if preview else ("18", "medium")
    cmd += ["-vf", vf, "-map", "0:v", "-map", "1:a", "-t", f"{duration:.3f}", "-c:a", "aac", "-b:a", "192k",
            "-c:v", "libx264", "-preset", preset, "-crf", crf, "-movflags", "+faststart", out]
    return cmd


def render_lyric_video(background: Optional[str], audio: str, ass: str, out: str, duration: float,
                       on_progress: Optional[Callable[[float], None]] = None, **kw) -> dict:
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    run(lyric_video_command(background, audio, ass, out, duration, **kw), duration, on_progress)
    return {"output": out, "duration": probe_duration(out)}
