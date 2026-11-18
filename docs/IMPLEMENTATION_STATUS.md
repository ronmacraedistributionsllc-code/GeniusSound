# Genius Sound — Implementation Status

Legend: **Verified** = covered by automated tests that ran. **Typechecked only** = compiles, not exercised against a real database/provider.
Last updated 2026-11-17.

## What is verified
- Backend engines (`api/`): 36 pytest tests pass — audio analysis (synthetic audio), storyboard rules, provider adapters (MOCKED HTTP), FFmpeg assembly + lyric-video render (real FFmpeg), promo picker, lyrics alignment, karaoke, creative director (MOCKED LLM), route guards.
- Web foundation: 33 vitest tests pass — env, storage (path-traversal safe), audio validation, auth helpers, CSRF/origin guard, rate limiting, and the job worker (claim, retry/backoff, cancel, crash recovery, no-handler failure) against an in-memory fake DB.
- `npm run lint`, `tsc --noEmit` and `next build` (30 routes) pass. A built server boots; protected pages redirect to /login; APIs return 401 without a session; cross-origin POSTs are blocked.

## NOT yet verified (needs your machine)
- **Anything that touches a real PostgreSQL database.** Prisma queries (register/login, project CRUD, upload, worker claim/save) are typechecked and unit-tested with a fake DB but have never run against Postgres. First real test: `./scripts/start.sh`, register, create a project, upload a song, watch it analyze.
- The media service + worker + web app running together.
- Live providers (ComfyUI/Replicate/fal) and a real LLM; Whisper transcription.

## Phases
| Phase | State |
|---|---|
| 1 Architecture/init | Done: schema+migration, docs, licensing audit, integration report, env, git |
| 2 Frontend/dashboard/projects | Built: login/register, 11-section nav, project create/rename/duplicate/delete/resume, dashboard, queue, assets, settings. Unverified against DB (see above). Missing: password change, profile edit |
| 3 Audio upload + analysis | Built end to end (upload w/ progress → job → worker → media API → saved sections, BPM, key, beat drops, energy; timeline UI with player). Unverified against DB. Section labels are heuristic. Lyrics transcription NOT wired |
| 4 Creative director | Engine built + mocked-LLM tests. No screen, no DB persistence, never run on a real model |
| 5 Storyboard | Rules engine built + tested. No screen, no DB persistence |
| 6 AI generation | Provider layer + endpoints built, mocked tests only. No screen, no worker handler, no approved ComfyUI workflow |
| 7 Artist identity | Not started (DB tables exist). Must avoid blocked models (see licensing audit) |
| 8 Lyrics + sync | Engine built (alignment, karaoke ASS, lyric-video render). No screen, no DB persistence, Whisper not run |
| 9 Assembly/render | Engine built + real FFmpeg tests. No screen, no worker handler, no render history persistence |
| 10 Promo clips | Picker built + tested. No screen/rendering wiring |
| 11 Test/security/deploy | Partial: CSRF guard, rate limit, input validation, upload sniffing, CI file. Missing: full security review, load testing, production deployment, S3 storage driver |

## Next steps, in order
1. Run it on the Mac and fix whatever the real database exposes (Phases 1–3 acceptance).
2. Worker handlers + screens for Phase 4 → 5 (concepts, storyboard) persisted through `api/services/storyboard.py`.
3. Phase 6 wiring + an approved ComfyUI workflow (needs a GPU endpoint).
4. Phase 8 lyrics screen, then 9 assembly/export, then 10 promo.
5. Phase 7 identity tools, Phase 11 hardening.
