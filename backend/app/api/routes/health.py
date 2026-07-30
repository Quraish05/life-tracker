import structlog
from fastapi import APIRouter, status
from sqlalchemy import text
from starlette.responses import JSONResponse

from app.api.deps import DbSession
from app.core.config import settings
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])
logger = structlog.get_logger("app.health")


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Liveness probe: the process is up and serving.

    Deliberately does NOT touch the database — liveness answers "is this process
    alive?", not "are its dependencies healthy?". Coupling them would let a brief
    DB blip make the platform kill (and restart-loop) an otherwise-fine container.
    """
    return HealthResponse(status="ok", version=settings.version)


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ReadinessResponse,
            "description": "A dependency is unavailable; do not route traffic here.",
        }
    },
)
async def readiness_check(db: DbSession) -> JSONResponse:
    """Readiness probe: can this instance actually serve requests right now?

    Runs a trivial ``SELECT 1`` round-trip to the database. On failure it returns
    503 so a load balancer / Kubernetes readiness probe stops routing to this
    instance until the dependency recovers — without killing the process.
    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        logger.warning("readiness_check_failed", check="database", exc_info=True)
        payload = ReadinessResponse(status="not ready", checks={"database": "unreachable"})
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload.model_dump()
        )

    payload = ReadinessResponse(status="ready", checks={"database": "ok"})
    return JSONResponse(content=payload.model_dump())
