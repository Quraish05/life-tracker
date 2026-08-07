import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware import RequestContextMiddleware
from app.api.router import api_router
from app.core.bootstrap import sync_superadmin
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import engine
from app.services.jobs.worker import run_worker_loop
from app.services.reminder_dispatch import run_dispatch_loop

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic migrations (`uv run alembic upgrade head`).
    # Reconcile the superadmin from SUPERADMIN_EMAIL before serving requests.
    # Guarded so a transient DB hiccup at boot degrades (log + serve) rather
    # than crash-looping the whole service — the next request will surface any
    # real DB problem.
    try:
        await sync_superadmin()
    except Exception:
        logger.exception("Superadmin bootstrap failed; continuing startup.")

    stop = asyncio.Event()
    background_tasks: list[asyncio.Task[None]] = []

    # Start the background push dispatcher only when it's enabled AND keys are
    # configured — otherwise pushes would fail every tick.
    if settings.push_dispatch_enabled:
        if settings.vapid_private_key and settings.vapid_public_key:
            background_tasks.append(asyncio.create_task(run_dispatch_loop(stop)))
        else:
            logger.warning(
                "push_dispatch_enabled is set but VAPID keys are missing; "
                "reminder push dispatch is disabled."
            )

    # Start the background job worker (schedules + offloaded work) when enabled.
    if settings.jobs_worker_enabled:
        background_tasks.append(asyncio.create_task(run_worker_loop(stop)))

    try:
        yield
    finally:
        stop.set()
        for task in background_tasks:
            await task
        await engine.dispose()


def create_app() -> FastAPI:
    # Configure logging first, before anything in the app has a chance to log.
    configure_logging()

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
    # Added last so it wraps the stack as the outermost layer: a request_id is
    # assigned (and log context bound) before any other middleware runs.
    app.add_middleware(RequestContextMiddleware)

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {"message": f"{settings.project_name} is running"}

    return app


app = create_app()
