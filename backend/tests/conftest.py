"""Shared test fixtures — including the first Postgres-backed harness.

Some features (full-text search, later pgvector/RAG) are pure Postgres and can't
be exercised with fakes or SQLite. These fixtures give a test its own real
database session that is **rolled back afterwards**, so tests never pollute each
other or leave rows behind.

- The schema is built once per session from the ORM models (`create_all`), and
  dropped at the end — so it stays in lockstep with the models, no migrations to
  run in tests.
- Each test gets a session wrapped in a transaction that is rolled back on
  teardown. `join_transaction_mode="create_savepoint"` means even a
  `session.commit()` inside a test lands on a savepoint and is still undone.

Target DB: `TEST_DATABASE_URL` if set, else `database_url` with `_test` appended
to the database name. Create it once with `createdb life_tracker_test`.
"""

import asyncio
import os
from urllib.parse import urlsplit, urlunsplit

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

import app.models  # noqa: F401 — register every model on Base.metadata
from app.core.config import settings
from app.db.base import Base


def _test_database_url() -> str:
    override = os.getenv("TEST_DATABASE_URL")
    if override:
        return override
    parts = urlsplit(settings.database_url)
    db_name = parts.path.lstrip("/")
    return urlunsplit(parts._replace(path=f"/{db_name}_test"))


TEST_DATABASE_URL = _test_database_url()


@pytest.fixture(scope="session")
def _create_schema():
    """Build the schema once for the whole test session, drop it at the end.

    NOT autouse: only tests that request the ``db`` fixture (which depends on
    this) touch Postgres, so DB-free tests stay DB-free and the suite doesn't
    require a test database unless a DB test actually runs.

    Run via ``asyncio.run`` in a plain (sync) fixture so it owns its own event
    loop and doesn't tangle with pytest-asyncio's per-test loop — the two only
    share the database, never engine objects.
    """

    async def _reset(create: bool) -> None:
        engine = create_async_engine(TEST_DATABASE_URL)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            if create:
                await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(_reset(create=True))
    yield
    asyncio.run(_reset(create=False))


@pytest_asyncio.fixture
async def db(_create_schema) -> AsyncSession:
    """A DB session bound to a transaction that is rolled back after the test.

    Depends on ``_create_schema`` so requesting ``db`` is what pulls in the
    schema — DB-free tests never trigger it. A fresh engine per test keeps
    everything inside pytest-asyncio's event loop (an async engine can't cross
    loops); cheap enough for DB-backed tests.
    """
    engine = create_async_engine(TEST_DATABASE_URL)
    connection = await engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(
        bind=connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()
