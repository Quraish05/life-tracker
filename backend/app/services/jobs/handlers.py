"""Job handlers and the kind -> handler registry.

A handler is an async function that takes the job's ``payload`` and returns a
JSON-serializable dict (stored as the job's ``result``) or ``None``. Register a
new background job by adding a handler here and an entry in ``REGISTRY``; the
worker dispatches on ``Job.kind``.

Two foundation/demo handlers plus the first real feature — the "week in review"
recap (on-demand for one user, and scheduled for every user). Future features
(the weekly journal digest, the nightly macro backfill) become new entries in
this registry the same way — that's the whole point of the primitive.
"""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.user import User
from app.services.weekly_recap import generate_and_store_recap

# A handler maps a payload to an optional result dict.
Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any] | None]]


async def handle_heartbeat(payload: dict[str, Any]) -> dict[str, Any]:
    """A do-nothing recurring job — proof the scheduler fires on its clock.

    Each run just records that it beat. Watch ``kind="heartbeat"`` rows appear
    in the jobs table once a minute to see the scheduler working end to end.
    """
    return {"beat": True}


async def handle_demo_echo(payload: dict[str, Any]) -> dict[str, Any]:
    """A slow one-off job — proof the queue offloads work off the request path.

    Sleeps (default 3s) then echoes its message back into ``result``. Enqueue it
    from the dev endpoint and watch a row go queued -> running -> done.
    """
    await asyncio.sleep(float(payload.get("delay_seconds", 3)))
    return {"echo": payload.get("message", "hello from the job runner")}


async def handle_weekly_recap(payload: dict[str, Any]) -> dict[str, Any]:
    """Recompute and store one user's "week in review". On-demand ("Refresh").

    Pure aggregation — no AI, no credit. The user id rides in the payload.
    """
    user_id = int(payload["user_id"])
    async with async_session_factory() as db:
        recap = await generate_and_store_recap(db, user_id)
    return {"user_id": user_id, "period_end": recap.period_end.isoformat(), **recap.data}


async def handle_weekly_recap_all(payload: dict[str, Any]) -> dict[str, Any]:
    """Refresh every user's recap. This is the scheduled Monday job.

    Each user's recap is upserted so it's already waiting when they next open
    the app — the real async win: precomputed, no on-open wait, no credit.
    """
    async with async_session_factory() as db:
        user_ids = list(await db.scalars(select(User.id)))
        for user_id in user_ids:
            await generate_and_store_recap(db, user_id)
    return {"users": len(user_ids)}


REGISTRY: dict[str, Handler] = {
    "heartbeat": handle_heartbeat,
    "demo_echo": handle_demo_echo,
    "weekly_recap": handle_weekly_recap,
    "weekly_recap_all": handle_weekly_recap_all,
}
