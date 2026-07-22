# Life Tracker — Backend

FastAPI backend for the Life Tracker app.

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL 16 (`brew install postgresql@16`)

## Setup

```bash
cd backend
uv sync                 # create .venv and install dependencies
cp .env.example .env    # optional: adjust settings

# Start PostgreSQL and create the database (one-time)
brew services start postgresql@16
createdb life_tracker

# Apply migrations
uv run alembic upgrade head
```

The default connection string is
`postgresql+asyncpg://quraish@localhost:5432/life_tracker` (local trust auth,
no password). Override it with `DATABASE_URL` in `.env`.

## Run

```bash
uv run uvicorn app.main:app --reload
```

- API root: http://localhost:8000/
- Health check: http://localhost:8000/api/v1/health
- Interactive docs (Swagger): http://localhost:8000/docs
- Alternative docs (ReDoc): http://localhost:8000/redoc

## Test & lint

```bash
uv run pytest
uv run ruff check .
uv run ruff format .
```

## Project layout

```
backend/
├── app/
│   ├── main.py              # app factory + middleware + lifespan
│   ├── core/config.py       # settings (pydantic-settings)
│   ├── api/
│   │   ├── router.py        # aggregates route modules
│   │   └── routes/          # endpoint modules (e.g. health.py)
│   ├── db/
│   │   ├── base.py          # DeclarativeBase for all models
│   │   └── session.py       # async engine + get_db dependency
│   ├── models/              # SQLAlchemy ORM models (e.g. item.py)
│   └── schemas/             # pydantic request/response models
└── tests/
```

Add new features by creating a module in `app/api/routes/`, a schema in
`app/schemas/`, and registering the router in `app/api/router.py`.

## Database

- Async SQLAlchemy 2.0 with the `asyncpg` driver.
- Inject a session into endpoints via the `get_db` dependency:

  ```python
  from fastapi import Depends
  from sqlalchemy.ext.asyncio import AsyncSession
  from app.db.session import get_db

  @router.get("/items")
  async def list_items(db: AsyncSession = Depends(get_db)):
      ...
  ```

### Migrations (Alembic)

The schema is managed by [Alembic](https://alembic.sqlalchemy.org/) (async setup).
The connection URL is read from app settings in `alembic/env.py`, so no need to
edit `alembic.ini`.

```bash
# After changing/adding a model in app/models/, autogenerate a migration:
uv run alembic revision --autogenerate -m "describe change"

# Review the generated file in alembic/versions/, then apply it:
uv run alembic upgrade head

# Other useful commands:
uv run alembic current          # show current revision
uv run alembic history          # list migrations
uv run alembic downgrade -1     # roll back one migration
uv run alembic check            # fail if models drift from migrations
```

New models must be imported in `app/models/__init__.py` so Alembic's
autogenerate can see them.
