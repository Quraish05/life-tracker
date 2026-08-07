"""Enqueue jobs and wake the worker.

``enqueue`` is the one entry point request handlers and the scheduler use to
add work. It commits the row itself and, on success, signals the worker loop to
re-compute its sleep — the same commit-then-signal ordering the reminder
dispatcher uses, so a job added while the worker is asleep still runs on time.
"""

import asyncio
from datetime import datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job

# Set whenever a job is enqueued, to wake the worker so it re-computes its sleep.
# Module-level so any request handler can signal it via enqueue().
_wakeup = asyncio.Event()


def signal_job_change() -> None:
    """Wake the worker loop to re-compute when it should next run.

    Called by ``enqueue`` *after committing*. Committing first is what makes it
    race-free: the loop clears this signal before it queries, so a new job is
    either already visible to that query or re-sets the signal and forces
    another pass — it can never be silently slept through.
    """
    _wakeup.set()


async def enqueue(
    db: AsyncSession,
    *,
    kind: str,
    payload: dict[str, Any] | None = None,
    run_at: datetime | None = None,
    dedupe_key: str | None = None,
    max_attempts: int = 1,
) -> int | None:
    """Add a job and wake the worker. Returns the new job id.

    With a ``dedupe_key`` the insert is a no-op if a row with that key already
    exists (``ON CONFLICT DO NOTHING``) — this is how a recurring schedule
    enqueues "the 12:01 occurrence" exactly once even if the worker wakes twice.
    In that de-duped case the return value is ``None`` and no wake is signalled.
    """
    values: dict[str, Any] = {"kind": kind, "payload": payload or {}, "max_attempts": max_attempts}
    if run_at is not None:
        values["run_at"] = run_at
    if dedupe_key is not None:
        values["dedupe_key"] = dedupe_key

    stmt = pg_insert(Job).values(**values).returning(Job.id)
    if dedupe_key is not None:
        stmt = stmt.on_conflict_do_nothing(index_elements=["dedupe_key"])

    result = await db.execute(stmt)
    await db.commit()
    job_id = result.scalar_one_or_none()
    if job_id is not None:
        signal_job_change()
    return job_id
