"""The background worker loop.

Modeled directly on ``app/services/reminder_dispatch.py``: an in-process
``asyncio`` loop, started in the app lifespan, that sleeps until the next job is
due (bounded by a max cap) and wakes early when a job is enqueued. Each tick it
(1) ensures recurring schedules have their next occurrence queued, (2) claims
due jobs, and (3) runs each claimed job's handler.

Claiming and running are split into separate transactions on purpose: a job is
flipped to ``running`` and committed *before* its handler executes, so the row
lock is released immediately and a slow handler (e.g. a 5-10s AI call) never
holds a transaction open. ``FOR UPDATE ... SKIP LOCKED`` means two workers — or
two ticks — never grab the same row.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.job import JOB_DONE, JOB_FAILED, JOB_QUEUED, JOB_RUNNING, Job
from app.services.jobs.handlers import REGISTRY
from app.services.jobs.queue import _wakeup
from app.services.jobs.schedules import ensure_scheduled_jobs

logger = logging.getLogger(__name__)

_MIN_SLEEP_SECONDS = 1.0
# How long a retryable failure waits before the worker picks the job up again.
_RETRY_BACKOFF_SECONDS = 30

# A claimed job carried out of the claim transaction as plain data, so running
# its handler doesn't touch the (now released) ORM row.
_ClaimedJob = tuple[int, str, dict]


async def _claim_due_jobs(db: AsyncSession, limit: int) -> list[_ClaimedJob]:
    """Atomically grab up to ``limit`` due jobs and mark them running.

    ``SKIP LOCKED`` lets this be safe even if more than one claimer runs. The
    transaction commits here — flipping status to ``running`` and releasing the
    row locks — before any handler runs.
    """
    jobs = list(
        await db.scalars(
            select(Job)
            .where(Job.status == JOB_QUEUED, Job.run_at <= func.now())
            .order_by(Job.run_at.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    )
    claimed: list[_ClaimedJob] = []
    for job in jobs:
        job.status = JOB_RUNNING
        job.locked_at = datetime.now(UTC)
        job.attempts += 1
        claimed.append((job.id, job.kind, dict(job.payload)))
    await db.commit()
    return claimed


async def _run_claimed_job(job_id: int, kind: str, payload: dict) -> None:
    """Run one claimed job's handler and record the outcome in its own txn.

    On success: ``done`` + ``result``. On failure: back to ``queued`` with a
    pushed-out ``run_at`` if retries remain, else ``failed`` + ``error``.
    """
    handler = REGISTRY.get(kind)
    async with async_session_factory() as db:
        job = await db.get(Job, job_id)
        if job is None:  # deleted mid-flight — nothing to do
            return
        try:
            if handler is None:
                raise ValueError(f"No handler registered for job kind {kind!r}")
            result = await handler(payload)
            job.status = JOB_DONE
            job.result = result
            job.error = None
        except Exception as exc:  # noqa: BLE001 — every handler failure is recorded, not raised
            if job.attempts < job.max_attempts:
                job.status = JOB_QUEUED
                job.run_at = datetime.now(UTC) + timedelta(seconds=_RETRY_BACKOFF_SECONDS)
            else:
                job.status = JOB_FAILED
            job.error = str(exc)
            logger.exception("Job %s (%s) failed on attempt %s", job_id, kind, job.attempts)
        await db.commit()


async def _seconds_until_next_job(db: AsyncSession) -> float:
    """How long to sleep before the next queued job comes due."""
    max_sleep = float(settings.jobs_worker_max_interval_seconds)
    next_run = await db.scalar(
        select(func.min(Job.run_at)).where(Job.status == JOB_QUEUED)
    )
    if next_run is None:
        return max_sleep
    now = await db.scalar(select(func.now()))
    delay = (next_run - now).total_seconds()
    return max(_MIN_SLEEP_SECONDS, min(delay, max_sleep))


async def _sleep_until_due_or_signal(stop: asyncio.Event, timeout: float) -> None:
    """Sleep up to ``timeout`` seconds, waking early on stop or an enqueue signal."""
    halt = asyncio.create_task(stop.wait())
    wake = asyncio.create_task(_wakeup.wait())
    try:
        await asyncio.wait(
            {halt, wake}, timeout=timeout, return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        halt.cancel()
        wake.cancel()


async def run_worker_loop(stop: asyncio.Event) -> None:
    """Enqueue schedules, run due jobs, sleep until the next one, until ``stop``."""
    logger.info(
        "Job worker loop started (adaptive, max %ss)",
        settings.jobs_worker_max_interval_seconds,
    )
    while not stop.is_set():
        # Clear before the query: a job enqueued from here on either shows up in
        # the claim below or re-sets the event and wakes the next sleep.
        _wakeup.clear()
        try:
            async with async_session_factory() as db:
                await ensure_scheduled_jobs(db)
                claimed = await _claim_due_jobs(db, settings.jobs_worker_batch_size)
                sleep_for = await _seconds_until_next_job(db)
            for job_id, kind, payload in claimed:
                await _run_claimed_job(job_id, kind, payload)
            if claimed:
                logger.info("Ran %s job(s)", len(claimed))
        except Exception:  # noqa: BLE001 — the loop must survive any iteration error
            logger.exception("Job worker iteration failed")
            sleep_for = float(settings.jobs_worker_max_interval_seconds)

        await _sleep_until_due_or_signal(stop, sleep_for)

    logger.info("Job worker loop stopped")
