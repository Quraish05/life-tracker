"""Shared mapping of AI-service errors to HTTP responses.

Every AI route wraps its ``await`` on a service call with ``ai_errors_as_http``:
a missing/rejected provider key becomes a 503 (surfacing the setup message so the
UI can explain it), any other AI failure a 502 with a generic, retryable detail.
"""

from contextlib import contextmanager

from fastapi import HTTPException, status

from app.services.ai_client import AIError, AINotConfiguredError


@contextmanager
def ai_errors_as_http(failure_detail: str):
    """Turn AI service exceptions raised inside the block into HTTP errors."""
    try:
        yield
    except AINotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except AIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=failure_detail
        ) from exc
