<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HANDOFF — read this first (updated 2026-11-17)

A review pass fixed Phase 1 and built Phases 2–3 end to end, then handed back to you. You are resuming. Do not start over.

**Rules (unchanged, from the original brief):** no fake data or fake generation results; every visible control must work or be clearly marked "not built"; no hardcoded keys; never claim something works unless tested; commercial licensing is audited — read `docs/LICENSING_AUDIT.md` before adding any dependency, model or font; never copy VocaVid (AGPL) code.

**What exists** (details in `docs/IMPLEMENTATION_STATUS.md`, `docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md`):
- Web app: auth, projects CRUD, audio upload, analysis view, queue, assets, settings. Libs in `src/lib/`, API routes in `src/app/api/`, worker in `worker/`.
- Media/AI engines in `api/` (analysis, storyboard rules, providers, FFmpeg assembly, lyrics/karaoke, creative director, promo). **Do not reimplement them; wire to them.** The old fake-data `backend/` was deleted — do not recreate it.
- Start everything: `./scripts/start.sh`. Tests: `npm test`, `cd api && PYTHONPATH=. pytest -q`.

**Your first task:** nothing that touches PostgreSQL has ever run for real. Run `./scripts/start.sh`, register, create a project, upload a song, confirm analysis completes. Fix what breaks (and add tests). Report honestly what worked.

**Then, in order:** Phase 4 screen + persistence (concepts via `/director/concepts`, save to `CreativeTreatment`) → Phase 5 storyboard screen persisted through `/storyboard/apply` → Phase 6 generation wiring (worker handler for `SCENE_GENERATION`: submit, poll, download real output into storage, never mark success without a real asset) → Phase 8 → 9 → 10 → 7 → 11.
Every new worker job type needs a handler in `worker/runner.ts` (unhandled types fail loudly) and tests.

**Known gaps:** password change/profile edit; S3 storage driver (`STORAGE_DRIVER=s3` throws); only the DB-free parts of the web app were exercised in the review sandbox.
