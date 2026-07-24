"""Background delivery of due reminders via Web Push.

An in-process ``asyncio`` loop (started in the app lifespan, see
``app/main.py``) finds reminders whose time has arrived and that haven't been
delivered, pushes them to each of the owner's subscriptions, and stamps
``sent_at`` so they don't repeat. A reminder is only marked delivered if at
least one push succeeded — so a user with no (or only dead) subscriptions still
gets it via the foreground ``/due`` poll when they next open the app.

Rather than waking on a fixed interval, the loop **sleeps until the next
upcoming reminder is actually due** (bounded by a max cap; see
``push_dispatch_max_interval_seconds``). Creating, updating, or deleting a
reminder calls :func:`signal_reminder_change`, which wakes the loop early so it
can re-compute that sleep — this is how a reminder set for "a minute from now",
created while the loop is asleep until tomorrow, still fires on time.
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

# Never sleep less than this, so an overdue reminder we can't deliver (e.g. its
# owner has no subscription) can't spin the loop into a tight retry.
_MIN_SLEEP_SECONDS = 1.0

# Set whenever a reminder changes, to wake the loop so it re-computes its sleep.
# Module-level so any request handler can signal it via signal_reminder_change.
_wakeup = asyncio.Event()


def signal_reminder_change() -> None:
    """Wake the dispatch loop to re-compute when it should next fire.

    Call this *after committing* any reminder create/update/delete. Committing
    first is what makes it race-free: the loop clears this signal before it
    queries, so a change is either already visible to that query or re-sets the
    signal and forces another pass — it can never be silently slept through.
    """
    _wakeup.set()


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


async def seconds_until_next_due(db: AsyncSession) -> float:
    """How long to sleep before the next *future* reminder comes due.

    Only reminders still ahead of us drive the timer — an overdue, undelivered
    reminder (one we just tried and couldn't push) must not pull this to zero
    and spin the loop. When nothing is upcoming we fall back to the max cap,
    which also acts as the retry cadence for those overdue-undelivered ones.
    """
    max_sleep = float(settings.push_dispatch_max_interval_seconds)
    next_due = await db.scalar(
        select(func.min(Reminder.remind_at)).where(
            Reminder.sent_at.is_(None), Reminder.remind_at > func.now()
        )
    )
    if next_due is None:
        return max_sleep

    now = await db.scalar(select(func.now()))
    delay = (next_due - now).total_seconds()
    return max(_MIN_SLEEP_SECONDS, min(delay, max_sleep))


async def _sleep_until_due_or_signal(stop: asyncio.Event, timeout: float) -> None:
    """Sleep up to ``timeout`` seconds, waking early on stop or a change signal."""
    halt = asyncio.create_task(stop.wait())
    wake = asyncio.create_task(_wakeup.wait())
    try:
        await asyncio.wait(
            {halt, wake}, timeout=timeout, return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        halt.cancel()
        wake.cancel()


async def run_dispatch_loop(stop: asyncio.Event) -> None:
    """Deliver due reminders, sleeping until the next one is due, until ``stop``.

    Each pass clears the change signal *before* querying so no create/update
    that lands mid-pass is lost, delivers whatever is currently due, then sleeps
    until the next reminder — waking early if a reminder changes or we're told
    to stop.
    """
    logger.info(
        "Reminder dispatch loop started (adaptive, max %ss)",
        settings.push_dispatch_max_interval_seconds,
    )
    while not stop.is_set():
        # Clear before the query: a change signalled from here on either shows
        # up in the query below or re-sets the event and wakes the next sleep.
        _wakeup.clear()
        try:
            async with async_session_factory() as db:
                count = await dispatch_once(db)
                sleep_for = await seconds_until_next_due(db)
            if count:
                logger.info("Dispatched %s reminder(s) via push", count)
        except Exception:  # noqa: BLE001 — the loop must survive any iteration error
            logger.exception("Reminder dispatch iteration failed")
            sleep_for = float(settings.push_dispatch_max_interval_seconds)

        await _sleep_until_due_or_signal(stop, sleep_for)

    logger.info("Reminder dispatch loop stopped")
