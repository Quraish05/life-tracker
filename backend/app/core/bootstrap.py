"""Startup bootstrap tasks that reconcile the DB with configuration.

Currently: make ``settings.superadmin_email`` the single source of truth for
who the superadmin is. Runs every boot and is idempotent.
"""

import logging

from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.user import ROLE_SUPERADMIN, ROLE_USER, User

logger = logging.getLogger(__name__)


async def sync_superadmin() -> None:
    """Promote the configured superadmin email; demote any stale superadmin.

    The env var is authoritative: the matching account (if it exists yet) is
    promoted, and anyone else still marked superadmin is demoted back to a
    regular user — so changing/clearing ``SUPERADMIN_EMAIL`` takes effect on the
    next boot. A blank email means "no superadmin": all are demoted.
    """
    target = settings.superadmin_email.strip().lower()

    async with async_session_factory() as db:
        current = list(
            await db.scalars(select(User).where(User.role == ROLE_SUPERADMIN))
        )
        # Demote anyone who is superadmin but no longer matches the config.
        for user in current:
            if not target or user.email.lower() != target:
                user.role = ROLE_USER
                logger.info("Demoted %s from superadmin", user.email)

        if target:
            promote = await db.scalar(
                select(User).where(func.lower(User.email) == target)
            )
            if promote is None:
                logger.warning(
                    "SUPERADMIN_EMAIL=%s has no account yet; will promote once "
                    "they register (re-runs each boot).",
                    target,
                )
            elif promote.role != ROLE_SUPERADMIN:
                promote.role = ROLE_SUPERADMIN
                logger.info("Promoted %s to superadmin", promote.email)

        await db.commit()
