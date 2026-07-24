"""Background delivery of due reminders via Web Push.

An in-process ``asyncio`` loop (started in the app lifespan, see
``app/main.py``) periodically finds reminders whose time has arrived and that
haven't been delivered, pushes them to each of the owner's subscriptions, and
stamps ``sent_at`` so they don't repeat. A reminder is only marked delivered
if at least one push succeeded — so a user with no (or only dead) subscriptions
still gets it via the foreground ``/due`` poll when they next open the app.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.push_subscription import PushSubscription
from app.models.reminder import Reminder
from app.services.push import send_web_push

logger = logging.getLogger(__name__)


async def dispatch_once(db: AsyncSession) -> int:
    """Push all currently-due reminders. Returns how many were delivered."""
    due = list(
        await db.scalars(
            select(Reminder)
            .where(Reminder.sent_at.is_(None), Reminder.remind_at <= func.now())
            .order_by(Reminder.remind_at.asc())
        )
    )
    if not due:
        return 0

    # Fetch every relevant user's subscriptions in one query, grouped by user.
    user_ids = {reminder.user_id for reminder in due}
    subscriptions = await db.scalars(
        select(PushSubscription).where(PushSubscription.user_id.in_(user_ids))
    )
    by_user: dict[int, list[PushSubscription]] = defaultdict(list)
    for subscription in subscriptions:
        by_user[subscription.user_id].append(subscription)

    to_prune: list[PushSubscription] = []
    delivered = 0

    for reminder in due:
        payload = {
            "title": reminder.title,
            "body": reminder.body,
            "reminderId": reminder.id,
            "url": "/reminders",
        }
        delivered_any = False
        for subscription in by_user.get(reminder.user_id, []):
            gone = await send_web_push(subscription, payload)
            if gone:
                to_prune.append(subscription)
            else:
                delivered_any = True

        if delivered_any:
            reminder.sent_at = datetime.now(UTC)
            delivered += 1

    for subscription in to_prune:
        await db.delete(subscription)

    await db.commit()
    return delivered


async def run_dispatch_loop(stop: asyncio.Event) -> None:
    """Run :func:`dispatch_once` on an interval until ``stop`` is set."""
    interval = settings.push_dispatch_interval_seconds
    logger.info("Reminder dispatch loop started (every %ss)", interval)
    while not stop.is_set():
        try:
            async with async_session_factory() as db:
                count = await dispatch_once(db)
            if count:
                logger.info("Dispatched %s reminder(s) via push", count)
        except Exception:  # noqa: BLE001 — the loop must survive any iteration error
            logger.exception("Reminder dispatch iteration failed")

        # Sleep, but wake immediately if we're asked to stop.
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except TimeoutError:
            pass

    logger.info("Reminder dispatch loop stopped")
