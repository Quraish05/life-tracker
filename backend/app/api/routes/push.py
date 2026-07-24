"""Web Push subscription management.

Clients register a browser push subscription here after the user grants
notification permission; the reminder dispatcher later sends to every stored
subscription. The VAPID public key is served so the client can subscribe.
"""

from fastapi import APIRouter, status
from sqlalchemy import delete, select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.core.config import settings
from app.models.push_subscription import PushSubscription
from app.schemas.push import (
    PushSubscriptionCreate,
    PushSubscriptionRead,
    PushUnsubscribe,
    VapidPublicKey,
)

router = APIRouter(prefix="/push", tags=["push"])


@router.get(
    "/public-key",
    response_model=VapidPublicKey,
    summary="Get the server's VAPID public key",
)
async def get_public_key() -> VapidPublicKey:
    """Return the VAPID public key the client needs to subscribe."""
    return VapidPublicKey(public_key=settings.vapid_public_key)


@router.post(
    "/subscribe",
    response_model=PushSubscriptionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register (or refresh) a push subscription",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def subscribe(
    payload: PushSubscriptionCreate, current_user: CurrentUser, db: DbSession
) -> PushSubscription:
    """Store the browser's push subscription for the current user.

    Idempotent by ``endpoint``: re-subscribing (same browser) updates the keys
    and re-owns the row to the current user rather than creating a duplicate.
    """
    existing = await db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    if existing is not None:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        subscription = existing
    else:
        subscription = PushSubscription(
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
        )
        db.add(subscription)

    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.delete(
    "/subscribe",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a push subscription",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def unsubscribe(
    payload: PushUnsubscribe, current_user: CurrentUser, db: DbSession
) -> None:
    """Delete the given subscription if it belongs to the current user."""
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    await db.commit()
