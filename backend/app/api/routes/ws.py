"""WebSocket endpoint for real-time live-sync.

Authenticated handshake + per-user registration. Once connected, a socket is
registered with the shared ``ConnectionManager``; domain routes (e.g. meals)
call ``manager.broadcast(user_id, event)`` and this user's other open tabs get
the push, which invalidates their client cache and re-renders.

Why the token is a query parameter, not a header: browsers cannot set an
``Authorization`` header on a WebSocket handshake (the JS ``WebSocket`` API
exposes no way to add headers). So the JWT rides in ``?token=`` and is validated
with the very same ``decode_access_token`` the HTTP routes use.
"""

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.api.deps import DbSession
from app.core.security import decode_access_token
from app.models.user import User
from app.services.ws_manager import manager

router = APIRouter(tags=["ws"])


async def _authenticate(token: str | None, db: DbSession) -> User | None:
    """Resolve the user from a ``?token=`` JWT, or return None if it's invalid.

    Mirrors ``deps.get_current_user`` but returns None instead of raising, so the
    caller can close the socket with a WebSocket status code rather than an HTTP
    error (there's no HTTP response to attach a 401 to once we're upgrading).
    """
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    return await db.get(User, user_id)


@router.websocket("/ws")
async def live_sync(websocket: WebSocket, db: DbSession, token: str | None = None) -> None:
    user = await _authenticate(token, db)
    if user is None:
        # Reject before accepting the upgrade. 1008 = "policy violation".
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    manager.connect(user.id, websocket)
    # An unsolicited server->client push: the client receives this simply for
    # connecting, which is the whole point of a WebSocket over request/response.
    await websocket.send_json({"type": "connected", "userId": user.id})

    try:
        # We don't need anything the client sends; this loop exists so that a
        # disconnect (which raises WebSocketDisconnect) is detected promptly and
        # the socket is deregistered in `finally`.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        # Runs on disconnect OR any error — the socket must always leave the
        # registry so we never broadcast into a dead connection.
        manager.disconnect(user.id, websocket)
