"""Per-request logging context.

:class:`RequestContextMiddleware` gives every request a ``request_id`` — honouring
an inbound ``X-Request-ID`` so a proxy or the frontend can propagate its own —
binds it (plus method and path) into structlog's contextvars so *every* log line
emitted while handling the request carries it, echoes the id back in the response
header for client-side correlation, and emits one structured access line with the
outcome and duration.
"""

import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("app.request")

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex

        # Fresh context per request; bind the correlation fields that every log
        # line for this request should carry.
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            # Log the failure with timing, then re-raise so error handling is
            # unchanged — we only add observability, we don't swallow anything.
            logger.exception(
                "request_failed",
                duration_ms=round((time.perf_counter() - start) * 1000, 2),
            )
            raise

        logger.info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=round((time.perf_counter() - start) * 1000, 2),
        )
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
