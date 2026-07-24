"""Send Web Push messages to stored subscriptions.

Wraps ``pywebpush`` (which is synchronous) so it can be awaited from the async
dispatch loop. A push to a subscription the push service no longer knows about
comes back as HTTP 404/410 — the caller uses that to prune the dead row.
"""

import asyncio
import json
import logging
from functools import lru_cache
from typing import Any

from py_vapid import Vapid02
from pywebpush import WebPushException, webpush

from app.core.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _vapid() -> Vapid02:
    """The VAPID signer, built once from the raw base64url private key."""
    return Vapid02.from_raw(settings.vapid_private_key.encode("utf-8"))


def _send_sync(subscription_info: dict[str, Any], payload: dict[str, Any]) -> None:
    """Blocking send — runs in a worker thread. Fresh claims dict per call
    because pywebpush mutates it (adds ``aud``/``exp``)."""
    webpush(
        subscription_info=subscription_info,
        data=json.dumps(payload),
        vapid_private_key=_vapid(),
        vapid_claims={"sub": settings.vapid_subject},
    )


async def send_web_push(
    subscription: PushSubscription, payload: dict[str, Any]
) -> bool:
    """Deliver one push notification.

    Returns ``True`` when the subscription is gone (HTTP 404/410) and should be
    pruned by the caller; ``False`` on success or a transient failure.
    """
    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
    }
    try:
        await asyncio.to_thread(_send_sync, subscription_info, payload)
        return False
    except WebPushException as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        if status_code in (404, 410):
            logger.info(
                "Pruning dead push subscription %s (HTTP %s)", subscription.id, status_code
            )
            return True
        logger.warning(
            "Web push failed for subscription %s: %s", subscription.id, exc
        )
        return False
