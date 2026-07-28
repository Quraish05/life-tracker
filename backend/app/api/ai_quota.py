"""Free-tier AI usage quota enforcement (MVP cost control).

Regular users share a lifetime pool of ``settings.ai_free_limit`` AI calls
across every AI feature; the superadmin is exempt. Each AI route calls
``enforce_ai_quota`` before doing any work (429 if the pool is spent), then
``record_ai_usage`` *after* the AI call succeeds — so a failed call (missing
provider key -> 503, model error -> 502) never burns a credit.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import error_response
from app.core.config import settings
from app.models.user import ROLE_SUPERADMIN, User

# Shown to a user who has spent their free AI calls. No payment gateway yet, so
# "upgrade" is aspirational — the cap is currently hard.
QUOTA_EXCEEDED = (
    "You've used all {limit} of your free AI actions. "
    "Upgrade to keep using AI features."
)

# OpenAPI ``responses`` entry for the 429 every AI route can return.
QUOTA_EXCEEDED_RESPONSE = {
    status.HTTP_429_TOO_MANY_REQUESTS: error_response(
        "Free AI quota exhausted",
        QUOTA_EXCEEDED.format(limit=settings.ai_free_limit),
    ),
}


def has_unlimited_ai(user: User) -> bool:
    """Whether the user bypasses the free AI quota (the superadmin does)."""
    return user.role == ROLE_SUPERADMIN


def enforce_ai_quota(user: User) -> None:
    """Raise 429 if a regular user has spent their free AI pool.

    Call this at the top of an AI route, before any AI work. The superadmin is
    always allowed through.
    """
    if has_unlimited_ai(user):
        return
    if user.ai_usage_count >= settings.ai_free_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=QUOTA_EXCEEDED.format(limit=settings.ai_free_limit),
        )


async def record_ai_usage(user: User, db: AsyncSession) -> None:
    """Count one successful AI call against the user's pool and persist it.

    No-op for the superadmin. Call this *after* the AI call succeeds so failed
    attempts don't consume a credit.
    """
    if has_unlimited_ai(user):
        return
    user.ai_usage_count += 1
    await db.commit()
