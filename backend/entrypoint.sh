#!/bin/sh
# Container entrypoint: bring the schema up to date, then serve.
# Migrations run here (not a platform "pre-deploy" hook) because Render's free
# tier has none. `alembic upgrade head` is idempotent — a no-op once current —
# so running it on every boot is safe. If it fails (e.g. DB unreachable) we exit
# non-zero and let the platform restart, rather than serve against a bad schema.
set -e

echo "Running database migrations…"
alembic upgrade head

echo "Starting server on port ${PORT:-8080}…"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"
