"""Tests for the background job runner foundation (Phase 0 + 1).

Exercises the parts that take a session directly — enqueue, dedupe, the
claim query, schedule idempotency, and the demo handlers. The full worker
*loop* opens its own sessions (by design, so slow handlers don't hold a
transaction), so it isn't driven here; its logic is covered piecewise.
"""

import pytest
from sqlalchemy import func, select

from app.models.job import JOB_QUEUED, JOB_RUNNING, Job
from app.services.jobs.handlers import handle_demo_echo, handle_heartbeat
from app.services.jobs.queue import enqueue
from app.services.jobs.schedules import ensure_scheduled_jobs
from app.services.jobs.worker import _claim_due_jobs


async def test_enqueue_creates_queued_job(db):
    job_id = await enqueue(db, kind="demo_echo", payload={"message": "hi"})
    job = await db.get(Job, job_id)
    assert job is not None
    assert job.kind == "demo_echo"
    assert job.status == JOB_QUEUED
    assert job.payload == {"message": "hi"}


async def test_enqueue_dedupe_key_is_idempotent(db):
    first = await enqueue(db, kind="heartbeat", dedupe_key="cron:heartbeat:x")
    second = await enqueue(db, kind="heartbeat", dedupe_key="cron:heartbeat:x")
    assert first is not None
    assert second is None  # ON CONFLICT DO NOTHING -> no second row
    count = await db.scalar(
        select(func.count()).select_from(Job).where(Job.dedupe_key == "cron:heartbeat:x")
    )
    assert count == 1


async def test_claim_marks_due_jobs_running(db):
    await enqueue(db, kind="demo_echo", payload={})
    claimed = await _claim_due_jobs(db, limit=10)
    assert len(claimed) == 1
    job_id, kind, _payload = claimed[0]
    assert kind == "demo_echo"
    job = await db.get(Job, job_id)
    assert job.status == JOB_RUNNING
    assert job.attempts == 1
    assert job.locked_at is not None


async def test_claim_skips_future_jobs(db):
    # Scheduled occurrences are enqueued with a future run_at and must not be
    # claimed until they're actually due.
    await ensure_scheduled_jobs(db)
    claimed = await _claim_due_jobs(db, limit=10)
    assert claimed == []


async def test_ensure_scheduled_jobs_is_idempotent(db):
    await ensure_scheduled_jobs(db)
    await ensure_scheduled_jobs(db)
    heartbeats = await db.scalar(
        select(func.count()).select_from(Job).where(Job.kind == "heartbeat")
    )
    assert heartbeats == 1  # same occurrence, enqueued once


@pytest.mark.parametrize(
    "handler,payload,expected",
    [
        (handle_demo_echo, {"delay_seconds": 0, "message": "yo"}, {"echo": "yo"}),
        (handle_heartbeat, {}, {"beat": True}),
    ],
)
async def test_handlers_return_expected_result(handler, payload, expected):
    assert await handler(payload) == expected
