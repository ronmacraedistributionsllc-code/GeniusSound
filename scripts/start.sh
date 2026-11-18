#!/usr/bin/env bash
# One-command local start for Genius Sound.  Usage: ./scripts/start.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { cp .env.example .env; echo "Created .env from .env.example — edit it, then re-run."; }
command -v node >/dev/null || { echo "Node.js 20+ required"; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.10+ required"; exit 1; }
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg not found — rendering will fail (brew install ffmpeg)"

# Database: use Docker Postgres if available and nothing is listening on 5432
if command -v docker >/dev/null && ! (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  docker compose up -d db
  until docker compose exec -T db pg_isready -U geniussound >/dev/null 2>&1; do sleep 1; done
fi

[ -d node_modules ] || npm install
npx prisma migrate deploy
npx prisma generate

[ -d api/.venv ] || python3 -m venv api/.venv
api/.venv/bin/pip install -q -r api/requirements.txt

mkdir -p .data/storage
trap 'kill 0' EXIT
(cd api && STORAGE_LOCAL_ROOT="$(cd .. && pwd)/.data/storage" .venv/bin/uvicorn main:app --port 8000) &
npm run dev
