#!/usr/bin/env bash
# Double-click to start Genius Sound natively (Postgres, media API, worker, web app on :3876).
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
( sleep 12; open "http://localhost:3876" ) &
./scripts/start.sh
echo; echo "Genius Sound stopped. Press Return to close."; read
