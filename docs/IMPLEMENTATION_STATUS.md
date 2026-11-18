# Genius Sound — Implementation Status

Legend: **Verified** = covered by automated tests that ran. **Typechecked only** = compiles, not exercised against a real database/provider.
Last updated 2026-11-17.

## What is verified (2026-11-18)
- Backend (`api/`): 40 pytest tests pass — audio analysis, storyboard rules, provider adapters (MOCKED HTTP, incl. image upload + t2v/i2v workflow choice), FFmpeg assembly and lyric-video render (REAL FFmpeg; also exercised through the real HTTP endpoints with a synthetic song), promo picker + trimmed promo render, lyrics alignment, karaoke, creative director (MOCKED LLM), route guards.
- Web: 47 vitest tests pass — env, storage, audio/image validation, auth, CSRF, rate limit, and the worker for every job type (analysis, lyric render, final export, promo clip, scene generation, Whisper sync) against an in-memory fake DB, including cancel-discards-results and "no success without a real file".
- `eslint`, `tsc --noEmit` and `next build` (all routes) pass.

## NOT yet verified (needs your machine)
- **Anything that touches a real PostgreSQL database.** All Prisma queries (auth, CRUD, upload, worker, lyrics, storyboard, generation, renders) are typechecked and fake-DB tested but have never run against Postgres. First real test: `./scripts/start.sh`.
- The three processes running together; the browser UI (never opened in a real browser by me).
- Live providers (ComfyUI workflow never executed; see docs/LOCAL_COMFYUI.md), a real LLM for concepts/storyboards, Whisper auto-sync.

## Phases
| Phase | State |
|---|---|
| 1 Architecture/init | Done: schema+migration, docs, licensing audit, integration report, env, git |
| 2 Frontend/dashboard/projects | Done: login/register, profile + password change, responsive 11-section nav (mobile drawer), project create/rename/duplicate/delete/resume, dashboard, queue (cancel/retry for every job type), asset library (audio, clips, renders), settings/service status |
| 3 Audio upload + analysis | Built end to end (upload → job → worker → saved sections, BPM, key, drops, energy; timeline UI) |
| 4 Creative director | Screen + persistence: generate concepts (needs an LLM), pick one |
| 5 Storyboard | Screen + persistence: generate from concept, edit, approve/reject, lock, reorder, delete; approved/locked scenes protected from regeneration |
| 6 AI generation | Worker handler + screen: per-scene clip via ComfyUI/Replicate/fal, downloads into storage, success only with a real file. Needs a configured provider |
| 7 Artist identity | Artist reference photos (PNG/JPEG) as image-to-video start frame, local ComfyUI only. No face-swap (blocked by licences). Identity can drift later in a clip |
| 8 Lyrics + sync | Screen + persistence: paste lyrics, estimated timing, Whisper auto-sync (needs faster-whisper), 3 karaoke styles, lyric-video render + download |
| 9 Assembly/export | Final export from generated clips + song (hard cut default keeps sync; short clips hold last frame), render history, download |
| 10 Promo clips | Suggest best moments, render trimmed 9:16 clips with synced lyrics |
| 11 Test/security/deploy | CSRF guard, rate limits, validation, upload sniffing, security headers, CI. Missing: S3 driver (the media service shares a local storage root, so S3 needs download/upload plumbing), load testing, production deployment, full security review |

## Known limits
- Lyric videos use a plain background; scene clips are not yet used as lyric-video backgrounds.
- Storyboard scene timing stays with each scene when reordered, so reordering changes cut order, not durations.
- One ComfyUI workflow per kind (`COMFYUI_WORKFLOW_ID`, optional `COMFYUI_WORKFLOW_ID_T2V`).

## Wired up (2026-11-18)
- ComfyUI: Wan 2.2 5B models installed; a real text-to-video test generated an h264 clip. `.env` points at 127.0.0.1:8188 and both workflows.
- LLM: LM Studio (`qwen/qwen3.6-35b-a3b`, http://127.0.0.1:1234/v1) answers; keep LM Studio's server running.
- `scripts/start.sh` now exports `.env` to the media API, worker and web app (previously the media API never saw provider settings).
- Ports: web 3876, media API 8876. Stop any stale `next dev` first (`kill <pid>`).
- Still unverified end to end: the browser UI against a real Postgres, and a full scene generation through the app.

## Verified on the Mac (2026-11-18, night)
- Launch: double-click `Start Genius Sound.command` (also on the Desktop). It stops stale runs, installs deps, migrates, starts media API :8876, worker, web :3876.
- Fixed: media API ignored `.env` (now loads it itself); lyric render failed because this Mac's FFmpeg cannot load `ass` (automatic Pillow overlay fallback, tested); Whisper crashed on PyAV 19 (audio decoded via ffmpeg, `av<18` pinned).
- Verified live: /providers shows comfyui configured; lyric render 200; LLM concepts return real output (~40 s); transcription loads and runs.
- Not yet exercised in the browser: full storyboard -> scene generation -> final export on a real song. Free disk space first (video needs several GB).

## End-to-end verified on the Mac (2026-11-18)
Throwaway account `pipeline-test@example.com` ran the whole chain through the live app:
upload -> analysis (99 BPM on a 100 BPM test track) -> LLM concepts (~36 s) -> storyboard (~80 s, 4 scenes) -> local ComfyUI scene (real mp4) -> final preview export (8 s, downloadable).
- Generation cost on this Mac: ~14-15 min per 5 s clip at 832x480 (Wan 2.2 5B). Defaults: `COMFYUI_WIDTH=832`, `COMFYUI_HEIGHT=480`, `COMFYUI_MAX_SECONDS=5` (longer scenes hold the last frame). A full 3-minute video of ~36 scenes is an overnight-plus job; use fewer/longer scenes, or lower `COMFYUI_WIDTH/HEIGHT`, or a cloud provider for speed.
- Final export requires every scene to have a clip (by design).
