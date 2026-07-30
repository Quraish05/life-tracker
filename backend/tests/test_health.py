from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import get_db
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_health_check():
    response = client.get(f"{settings.api_v1_prefix}/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == settings.version


# ---- readiness --------------------------------------------------------------
#
# Readiness is exercised with a fake DB session injected via FastAPI's
# dependency override, so the tests are deterministic and need no real Postgres.


class _OkDb:
    """A stand-in session whose SELECT 1 succeeds."""

    async def execute(self, statement):  # noqa: ANN001 - test double
        return None


class _BrokenDb:
    """A stand-in session whose SELECT 1 raises, as if the DB were unreachable."""

    async def execute(self, statement):  # noqa: ANN001 - test double
        raise OSError("connection refused")


def _override_db(fake):
    async def _dep():
        yield fake

    return _dep


def test_readiness_ok_when_db_reachable():
    app.dependency_overrides[get_db] = _override_db(_OkDb())
    try:
        response = client.get(f"{settings.api_v1_prefix}/health/ready")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ready"
        assert body["checks"]["database"] == "ok"
    finally:
        app.dependency_overrides.clear()


def test_readiness_503_when_db_unreachable():
    app.dependency_overrides[get_db] = _override_db(_BrokenDb())
    try:
        response = client.get(f"{settings.api_v1_prefix}/health/ready")
        assert response.status_code == 503
        body = response.json()
        assert body["status"] == "not ready"
        assert body["checks"]["database"] == "unreachable"
    finally:
        app.dependency_overrides.clear()


def test_liveness_never_touches_db():
    # A broken DB must NOT affect liveness — that's the whole point of the split.
    app.dependency_overrides[get_db] = _override_db(_BrokenDb())
    try:
        response = client.get(f"{settings.api_v1_prefix}/health")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()
