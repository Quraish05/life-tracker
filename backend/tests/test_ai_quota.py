"""Unit tests for the free-tier AI usage quota (app/api/ai_quota.py).

Pure logic — no DB or network. ``record_ai_usage`` is exercised against a tiny
fake session that records commits.
"""

import asyncio
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException

from app.api.ai_quota import enforce_ai_quota, has_unlimited_ai, record_ai_usage
from app.core.config import settings
from app.models.user import ROLE_SUPERADMIN, ROLE_USER, User
from app.schemas.user import UserRead


class FakeSession:
    """Stand-in for AsyncSession that only needs to count commits."""

    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


def _user(*, role: str = ROLE_USER, used: int = 0) -> User:
    return User(
        id=1,
        username="alice",
        email="alice@example.com",
        hashed_password="x",
        role=role,
        ai_usage_count=used,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


# ---- enforce_ai_quota -------------------------------------------------------


def test_under_limit_is_allowed():
    enforce_ai_quota(_user(used=settings.ai_free_limit - 1))  # no raise


def test_at_limit_is_blocked():
    with pytest.raises(HTTPException) as exc:
        enforce_ai_quota(_user(used=settings.ai_free_limit))
    assert exc.value.status_code == 429
    assert "Upgrade" in exc.value.detail


def test_over_limit_is_blocked():
    with pytest.raises(HTTPException) as exc:
        enforce_ai_quota(_user(used=settings.ai_free_limit + 5))
    assert exc.value.status_code == 429


def test_superadmin_is_never_blocked():
    # Well over the limit, but exempt.
    enforce_ai_quota(_user(role=ROLE_SUPERADMIN, used=settings.ai_free_limit * 10))


def test_has_unlimited_ai():
    assert has_unlimited_ai(_user(role=ROLE_SUPERADMIN)) is True
    assert has_unlimited_ai(_user(role=ROLE_USER)) is False


# ---- record_ai_usage --------------------------------------------------------


def test_record_increments_and_commits_for_regular_user():
    user = _user(used=2)
    db = FakeSession()
    asyncio.run(record_ai_usage(user, db))
    assert user.ai_usage_count == 3
    assert db.commits == 1


def test_record_is_noop_for_superadmin():
    user = _user(role=ROLE_SUPERADMIN, used=0)
    db = FakeSession()
    asyncio.run(record_ai_usage(user, db))
    assert user.ai_usage_count == 0
    assert db.commits == 0


# ---- UserRead quota fields --------------------------------------------------


def test_user_read_reports_remaining_for_regular_user():
    view = UserRead.model_validate(_user(used=3))
    assert view.ai_limit == settings.ai_free_limit
    assert view.ai_remaining == settings.ai_free_limit - 3


def test_user_read_remaining_never_negative():
    view = UserRead.model_validate(_user(used=settings.ai_free_limit + 4))
    assert view.ai_remaining == 0


def test_user_read_remaining_is_none_for_superadmin():
    view = UserRead.model_validate(_user(role=ROLE_SUPERADMIN, used=99))
    assert view.ai_remaining is None
