#!/usr/bin/env bash
# One-command local start for Genius Sound.  Usage: ./scripts/start.sh
# Starts: Postgres (Docker, if needed) -> migrations -> media API (:8876) -> job worker -> web app (:3876)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a real session secret so you never run with the example value.
  SECRET="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
  sed -i.bak "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$SECRET\"|" .env && rm -f .env.bak
  echo "Created .env with a fresh AUTH_SECRET. Edit it to add provider keys later."
fi
command -v node >/dev/null || { echo "Node.js 20+ required"; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.10+ required"; exit 1; }
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg not found — rendering will fail (brew install ffmpeg)"

# Database: use Docker Postgres if available and nothing is listening on 5432
if command -v docker >/dev/null && ! (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  docker compose up -d db
  until docker compose exec -T db pg_isready -U geniussound >/dev/null 2>&1; do sleep 1; done
fi

npm install --no-audit --no-fund
npx prisma generate
if ! (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  echo "ERROR: Postgres is not reachable on localhost:5432. Start Docker Desktop (or your own Postgres) and rerun."; exit 1
fi
npx prisma migrate deploy

[ -d api/.venv ] || python3 -m venv api/.venv
api/.venv/bin/pip install -q -r api/requirements.txt

mkdir -p .data/storage
for p in 3876 8876; do
  if (echo > /dev/tcp/127.0.0.1/$p) 2>/dev/null; then
    echo "ERROR: port $p is already in use. Free it (lsof -i :$p) and rerun."; exit 1
  fi
done
ROOT="$(pwd)"
trap 'kill 0' EXIT
(cd api && STORAGE_LOCAL_ROOT="$ROOT/.data/storage" .venv/bin/uvicorn main:app --port 8876) &
npm run worker &
npm run dev
