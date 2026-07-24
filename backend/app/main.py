import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.services.reminder_dispatch import run_dispatch_loop

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic migrations (`uv run alembic upgrade head`).
    stop = asyncio.Event()
    dispatch_task: asyncio.Task[None] | None = None

    # Start the background push dispatcher only when it's enabled AND keys are
    # configured — otherwise pushes would fail every tick.
    if settings.push_dispatch_enabled:
        if settings.vapid_private_key and settings.vapid_public_key:
            dispatch_task = asyncio.create_task(run_dispatch_loop(stop))
        else:
            logger.warning(
                "push_dispatch_enabled is set but VAPID keys are missing; "
                "reminder push dispatch is disabled."
            )

    try:
        yield
    finally:
        stop.set()
        if dispatch_task is not None:
            await dispatch_task
        await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {"message": f"{settings.project_name} is running"}

    return app


app = create_app()
