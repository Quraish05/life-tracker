# Life Tracker — Backend

FastAPI backend for the Life Tracker app.

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
cd backend
uv sync                 # create .venv and install dependencies
cp .env.example .env    # optional: adjust settings
```

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
│   ├── main.py              # app factory + middleware
│   ├── core/config.py       # settings (pydantic-settings)
│   ├── api/
│   │   ├── router.py        # aggregates route modules
│   │   └── routes/          # endpoint modules (e.g. health.py)
│   └── schemas/             # pydantic request/response models
└── tests/
```

Add new features by creating a module in `app/api/routes/`, a schema in
`app/schemas/`, and registering the router in `app/api/router.py`.
