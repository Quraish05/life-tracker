"""The recurring / cron layer (Phase 1).

A ``Schedule`` says "run this ``kind`` on this cron spec". On every worker tick,
``ensure_scheduled_jobs`` computes each schedule's *next* fire time and enqueues
a job for it, keyed so it can't be enqueued twice. Because the worker sleeps
until the earliest queued ``run_at``, that enqueued occurrence is exactly what
wakes it at the right moment; running it triggers the next tick, which enqueues
the occurrence after that. No separate scheduler process — the worker is it.

To add a scheduled feature: write a handler in ``handlers.py`` and add a
``Schedule`` row here. That's the whole contract.
"""

from dataclasses import dataclass, field
from typing import Any

from croniter import croniter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.jobs.queue import enqueue


@dataclass(frozen=True)
class Schedule:
    kind: str
    # Standard 5-field cron spec ("min hour dom mon dow"), interpreted in the
    # database's timezone (func.now() drives the clock).
    cron: str
    payload: dict[str, Any] = field(default_factory=dict)


# The recurring jobs the worker keeps enqueued. "heartbeat" every minute is the
# live proof-of-life; "weekly_recap_all" precomputes every user's week-in-review
# every Monday at 08:00 so it's waiting when they open the app.
SCHEDULES: list[Schedule] = [
    Schedule(kind="heartbeat", cron="* * * * *"),
    Schedule(kind="weekly_recap_all", cron="0 8 * * 1"),
]


async def ensure_scheduled_jobs(db: AsyncSession) -> None:
    """Enqueue the next occurrence of every recurring schedule (idempotently)."""
    now = await db.scalar(select(func.now()))
    for schedule in SCHEDULES:
        next_run = croniter(schedule.cron, now).get_next(type(now))
        dedupe_key = f"cron:{schedule.kind}:{next_run.isoformat()}"
        await enqueue(
            db,
            kind=schedule.kind,
            payload=schedule.payload,
            run_at=next_run,
            dedupe_key=dedupe_key,
        )
