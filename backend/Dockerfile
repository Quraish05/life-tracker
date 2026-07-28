# Life Tracker API — production image.
# Uses uv for fast, lockfile-pinned installs. Portable across Fly.io, Railway,
# Render, etc.: the app listens on ${PORT:-8080}.
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# uv binary from its official image (no pip bootstrap needed).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first (cached layer) from the lockfile only.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Then the application code.
COPY . .
RUN uv sync --frozen --no-dev && chmod +x entrypoint.sh

# Put the venv on PATH so `uvicorn` / `alembic` resolve without `uv run`.
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8080

# entrypoint.sh runs migrations, then `exec`s uvicorn (so SIGTERM reaches it for
# clean shutdowns). Binds to $PORT — Render/Railway set it; else falls back 8080.
CMD ["./entrypoint.sh"]
