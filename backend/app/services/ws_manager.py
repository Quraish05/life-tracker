"""In-memory WebSocket connection registry + per-user broadcast.

Tracks every open socket grouped by user, so a change made on one device can be
pushed to that user's *other* open tabs/devices (live sync).

⚠️ SCALING CAVEAT (the deliberate lesson): this state lives in THIS process only.
With more than one backend replica, a broadcast reaches only the sockets
connected to the same replica — the others miss it. Fine for a single instance
(our Render free tier). A multi-replica deploy would need a shared pub/sub
(e.g. Redis) to fan events out across processes — the exact same limitation as
the in-process reminder dispatcher.
"""

import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # user_id -> the set of that user's currently-open sockets.
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)

    def connect(self, user_id: int, websocket: WebSocket) -> None:
        """Register an already-accepted socket under its user."""
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        """Deregister a socket; drop the user's bucket once it's empty."""
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            del self._connections[user_id]

    async def broadcast(self, user_id: int, message: dict[str, Any]) -> None:
        """Send ``message`` (as JSON) to every open socket for one user.

        Iterates a copy so a socket removed mid-send can't mutate the set under
        us, and drops any socket that errors (its own receive loop will also
        clean it up, but this keeps a dead socket from blocking the rest).
        """
        for websocket in list(self._connections.get(user_id, ())):
            try:
                await websocket.send_json(message)
            except Exception:
                logger.debug("Dropping dead socket for user %s", user_id)
                self.disconnect(user_id, websocket)


# Module-level singleton: one registry shared by the /ws endpoint and the routes
# that emit events (meals, etc.).
manager = ConnectionManager()
