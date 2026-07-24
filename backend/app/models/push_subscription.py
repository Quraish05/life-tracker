from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PushSubscription(Base):
    """A Web Push subscription belonging to a user.

    One user may have several — one per browser/device they've enabled
    notifications on. ``endpoint`` is the push service URL (globally unique);
    ``p256dh`` and ``auth`` are the client's encryption keys, taken straight
    from the browser's ``PushSubscription`` JSON. The reminder dispatcher
    sends to every subscription a user has and prunes any the push service
    reports as gone (HTTP 404/410).
    """

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    endpoint: Mapped[str] = mapped_column(String(1024), unique=True, index=True)
    p256dh: Mapped[str] = mapped_column(String(255))
    auth: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
