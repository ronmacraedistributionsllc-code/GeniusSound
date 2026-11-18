<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Genius Sound — standing instruction (do not remove until done)

A review found Phase 1 was marked complete but had gaps. When you finish the Phase you are currently working on, and BEFORE starting the next Phase:

1. Read `docs/PHASE1_GAPS.md` and complete every open item in it (README tree fix, status doc corrections, `npm test` + vitest config + a real test, `src/lib` basics, Job-table worker, git commit).
2. Read `docs/ARCHITECTURE.md`, `docs/LICENSING_AUDIT.md` and `docs/COMPONENT_INTEGRATION_REPORT.md`. Follow them: never copy VocaVid (AGPL) code, and never load a model marked blocked in the audit.
3. Update `docs/IMPLEMENTATION_STATUS.md` honestly (only tick items that are built and tested), then tick the items off in `docs/PHASE1_GAPS.md`.
4. Report to the user what you fixed, then continue to the next Phase.

Do not overwrite the new docs or `api/`; extend them.

### Backend engines already built (read before writing Phases 3, 5, 6, 9, 10)
`api/` already contains tested engines for audio analysis, storyboard rules, provider adapters, FFmpeg assembly and promo clip selection.
Do NOT reimplement them. Read `docs/API_CONTRACT.md` and `docs/BACKEND_STATUS.md`, then wire the Next.js app, Job worker and Prisma persistence to those endpoints.

### Rules added after review (read now)
- Do NOT use or extend `backend/`. It contains fake data (hardcoded projects, simulated durations, fake "generation started"). Remove it. Project/storyboard persistence = Next.js route handlers + Prisma. Media/AI work = `api/` (see `docs/API_CONTRACT.md`).
- `api/` now also has lyrics alignment, karaoke/lyric-video render and the creative director (Phases 4 and 8). Wire to them; do not reimplement.
- Start everything with `./scripts/start.sh`; CI is in `.github/workflows/ci.yml`.
