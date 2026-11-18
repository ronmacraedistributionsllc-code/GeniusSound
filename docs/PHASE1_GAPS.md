> **Open items below — complete them after the current phase (see AGENTS.md).**

# Phase 1 Gap Fixes (added after review, 2026-11-17)

**RESOLVED 2026-11-17** — every item below was fixed in the review pass (README, status doc, `npm test`+vitest, `src/lib`, worker, `backend/` removed, git commits). Kept for history. See `docs/IMPLEMENTATION_STATUS.md`.


Added: `docs/ARCHITECTURE.md`, `docs/COMPONENT_INTEGRATION_REPORT.md`, corrected `docs/LICENSING_AUDIT.md`,
`api/` FastAPI skeleton (`/health`, tests), `.gitignore` now tracks `.env.example`.

Still open for the building agent (files left alone to avoid edit conflicts):
1. `README.md` project tree lists paths that do not exist (`src/app/api`, `src/app/projects`, `src/lib/hooks`, root `requirements.txt`). Make it match reality (backend deps are in `api/requirements.txt`).
2. `docs/IMPLEMENTATION_STATUS.md`: Phase 1 items "FastAPI backend structure" is now true; add "worker" and "tests" honestly as not built.
3. `package.json`: add `"test": "vitest run"`, prisma scripts, and a `vitest.config.ts` plus at least one real test.
4. `src/lib/`: add `db.ts` (Prisma client singleton), `env.ts` (zod-validated env), storage adapter interface.
5. Worker: implement Job-table polling worker (Phase 3 start).
6. Commit work to git.
7. **`backend/main.py` (created by the building agent) is a stub that returns FAKE data** (hardcoded project "Summer Vibes", simulated `duration_sec: 225.0`, "Generation started" with no job). This violates the "no fake results" rule and duplicates `api/`. Delete `backend/` (or reduce it to nothing) and use `api/` + Next.js route handlers backed by Prisma. Real project CRUD belongs in Next.js + Prisma, not in a second FastAPI app.
