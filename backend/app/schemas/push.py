"""Request/response schemas for Web Push subscriptions.

The browser's ``PushSubscription.toJSON()`` has the shape
``{ "endpoint": ..., "keys": { "p256dh": ..., "auth": ... } }`` — the create
schema accepts it verbatim so the client can post it as-is.
"""

from pydantic import BaseModel, ConfigDict, Field


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=255)
    auth: str = Field(min_length=1, max_length=255)


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=1, max_length=1024)
    keys: PushKeys


class PushUnsubscribe(BaseModel):
    endpoint: str = Field(min_length=1, max_length=1024)


class PushSubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    endpoint: str


class VapidPublicKey(BaseModel):
    """The server's VAPID public key, for ``pushManager.subscribe``."""

    public_key: str
