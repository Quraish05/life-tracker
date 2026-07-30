"""Tests for RequestContextMiddleware (app/api/middleware.py).

The middleware's user-observable contract is the ``X-Request-ID`` header: it is
always present on the response, honours an inbound id, and is unique per request
when the client doesn't supply one.
"""

from fastapi.testclient import TestClient

from app.api.middleware import REQUEST_ID_HEADER
from app.main import app

client = TestClient(app)


def test_response_has_request_id_header():
    response = client.get("/")
    assert response.status_code == 200
    request_id = response.headers.get(REQUEST_ID_HEADER)
    # A generated id is a 32-char uuid4 hex string.
    assert request_id is not None
    assert len(request_id) == 32


def test_inbound_request_id_is_echoed():
    response = client.get("/", headers={REQUEST_ID_HEADER: "trace-abc-123"})
    assert response.headers.get(REQUEST_ID_HEADER) == "trace-abc-123"


def test_generated_ids_are_unique_per_request():
    first = client.get("/").headers[REQUEST_ID_HEADER]
    second = client.get("/").headers[REQUEST_ID_HEADER]
    assert first != second
