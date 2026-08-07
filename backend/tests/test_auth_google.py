"""HTTP-level tests for Google Sign-In (POST /auth/google).

The Google ID-token verifier is mocked (no network / real Google token) by
patching ``verify_google_id_token`` in the auth route module. The endpoint's
find-or-create-by-email behaviour is exercised against the real Postgres test
session (the ``db`` fixture), so username generation and persistence are real.
"""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

import app.api.routes.auth as auth_route
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.user import User

GOOGLE_URL = f"{settings.api_v1_prefix}/auth/google"


@pytest_asyncio.fixture
async def client(db, monkeypatch):
    """AsyncClient bound to the app, with get_db overridden to the test session
    and a configured Google client id. Runs in the same event loop as ``db``."""
    monkeypatch.setattr(
        settings, "google_client_id", "test-client.apps.googleusercontent.com"
    )

    async def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


def _mock_claims(monkeypatch, claims: dict) -> None:
    monkeypatch.setattr(auth_route, "verify_google_id_token", lambda _cred: claims)


def _mock_invalid(monkeypatch) -> None:
    def _raise(_cred):
        raise ValueError("bad token")

    monkeypatch.setattr(auth_route, "verify_google_id_token", _raise)


async def test_first_signin_creates_user(client, db, monkeypatch):
    _mock_claims(
        monkeypatch,
        {"email": "New.Person@example.com", "email_verified": True, "name": "New"},
    )

    res = await client.post(GOOGLE_URL, json={"credential": "tok"})

    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    # Email is normalised to lowercase; a username is derived from the local part.
    assert body["user"]["email"] == "new.person@example.com"
    assert body["user"]["username"] == "newperson"

    row = await db.scalar(select(User).where(User.email == "new.person@example.com"))
    assert row is not None
    assert row.hashed_password is None  # SSO account: no password


async def test_existing_user_is_logged_in_not_duplicated(client, db, monkeypatch):
    existing = User(username="already", email="dup@example.com", hashed_password=None)
    db.add(existing)
    await db.commit()

    _mock_claims(
        monkeypatch, {"email": "dup@example.com", "email_verified": True}
    )
    res = await client.post(GOOGLE_URL, json={"credential": "tok"})

    assert res.status_code == 200
    assert res.json()["user"]["id"] == existing.id
    count = await db.scalar(
        select(func.count()).select_from(User).where(User.email == "dup@example.com")
    )
    assert count == 1


async def test_username_collision_gets_suffixed(client, db, monkeypatch):
    # A user already owns the username the new Google account would derive.
    db.add(User(username="taken", email="someone@other.com", hashed_password="x"))
    await db.commit()

    _mock_claims(
        monkeypatch, {"email": "taken@example.com", "email_verified": True}
    )
    res = await client.post(GOOGLE_URL, json={"credential": "tok"})

    assert res.status_code == 200
    assert res.json()["user"]["username"] == "taken1"


async def test_unverified_email_is_rejected(client, monkeypatch):
    _mock_claims(
        monkeypatch, {"email": "shady@example.com", "email_verified": False}
    )
    res = await client.post(GOOGLE_URL, json={"credential": "tok"})
    assert res.status_code == 401


async def test_invalid_token_is_rejected(client, monkeypatch):
    _mock_invalid(monkeypatch)
    res = await client.post(GOOGLE_URL, json={"credential": "tok"})
    assert res.status_code == 401


async def test_returns_503_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    _mock_claims(
        monkeypatch, {"email": "x@example.com", "email_verified": True}
    )
    res = await client.post(GOOGLE_URL, json={"credential": "tok"})
    assert res.status_code == 503
