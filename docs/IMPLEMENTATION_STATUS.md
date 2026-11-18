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
