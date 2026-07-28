from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Authorization roles. "superadmin" (the maintainer) bypasses the AI quota;
# everyone else is a "user" with the free AI limit. Kept as a plain string
# column rather than a DB enum so adding tiers later needs no migration.
ROLE_USER = "user"
ROLE_SUPERADMIN = "superadmin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    # Authorization role — see ROLE_* constants above.
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=ROLE_USER
    )
    # Lifetime count of AI calls made across all AI features. Compared against
    # settings.ai_free_limit to enforce the free quota (superadmin exempt).
    ai_usage_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
