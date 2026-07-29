"""WebSocket live-sync handshake tests.

No real database: we override ``get_db`` with a fake session whose ``.get()``
returns a canned user (or None). That lets us exercise the auth accept/reject
paths and the echo pipe without a running Postgres — same spirit as the
``FakeSession`` in test_ai_quota.
"""

import asyncio
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models.user import ROLE_USER, User
from app.services.ws_manager import ConnectionManager

WS_URL = "/api/v1/ws"


class _FakeSession:
    """Stand-in for AsyncSession: only ``.get(User, id)`` is used by the endpoint."""

    def __init__(self, user: User | None) -> None:
        self._user = user

    async def get(self, model, pk):
        return self._user if (self._user is not None and self._user.id == pk) else None


def _user() -> User:
    return User(
        id=1,
        username="alice",
        email="alice@example.com",
        hashed_password="x",
        role=ROLE_USER,
        ai_usage_count=0,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.fixture
def client_for():
    """Yield a factory: `client_for(user_or_None)` -> TestClient with get_db overridden."""

    def _make(user: User | None) -> TestClient:
        async def _get_db():
            yield _FakeSession(user)

        app.dependency_overrides[get_db] = _get_db
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


def test_rejects_connection_without_token(client_for):
    client = client_for(None)
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(WS_URL):
            pass


def test_rejects_connection_with_bad_token(client_for):
    client = client_for(_user())
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{WS_URL}?token=not.a.real.jwt"):
            pass


def test_accepts_valid_token_and_greets(client_for):
    client = client_for(_user())
    token = create_access_token(1)
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        hello = ws.receive_json()
        assert hello == {"type": "connected", "userId": 1}


# ---- ConnectionManager (the broadcast core) --------------------------------


class _FakeWS:
    """Records what the manager sends, so we can assert delivery without a socket."""

    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_json(self, data: dict) -> None:
        self.sent.append(data)


def test_broadcast_reaches_only_that_users_sockets():
    async def scenario():
        mgr = ConnectionManager()
        alice_tab1, alice_tab2, bob_tab = _FakeWS(), _FakeWS(), _FakeWS()
        mgr.connect(1, alice_tab1)
        mgr.connect(1, alice_tab2)
        mgr.connect(2, bob_tab)

        event = {"type": "meal.created", "id": 7}
        await mgr.broadcast(1, event)

        # Both of Alice's tabs get it; Bob (a different user) does not.
        assert alice_tab1.sent == [event]
        assert alice_tab2.sent == [event]
        assert bob_tab.sent == []

    asyncio.run(scenario())


def test_disconnect_deregisters_socket():
    async def scenario():
        mgr = ConnectionManager()
        tab = _FakeWS()
        mgr.connect(1, tab)
        mgr.disconnect(1, tab)

        # After disconnect, a broadcast reaches nobody (no error either).
        await mgr.broadcast(1, {"type": "meal.created"})
        assert tab.sent == []

    asyncio.run(scenario())
