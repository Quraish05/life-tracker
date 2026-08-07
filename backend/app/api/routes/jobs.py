"""Dev-only observability for the background job runner.

These endpoints exist ONLY when ``ENVIRONMENT`` is not "production" — they're
how you *see* the foundation working before any real feature runs on it: list
recent jobs, and enqueue a demo job to watch it flow queued -> running -> done.
Requiring auth keeps them from being wide open even in a shared dev deploy.
"""

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.core.config import settings
from app.models.job import Job
from app.schemas.job import DemoJobRequest, JobRead
from app.services.jobs.queue import enqueue

router = APIRouter(prefix="/jobs", tags=["jobs"])

if settings.environment != "production":

    @router.get(
        "",
        response_model=list[JobRead],
        summary="[dev only] List recent background jobs",
        responses={**UNAUTHORIZED_RESPONSE},
    )
    async def list_jobs(current_user: CurrentUser, db: DbSession) -> list[Job]:
        """Return the most recent jobs, newest first. DEV ONLY."""
        result = await db.scalars(select(Job).order_by(Job.id.desc()).limit(50))
        return list(result)

    @router.post(
        "/demo",
        response_model=JobRead,
        status_code=status.HTTP_201_CREATED,
        summary="[dev only] Enqueue a demo job to watch it run",
        responses={**UNAUTHORIZED_RESPONSE},
    )
    async def enqueue_demo_job(
        payload: DemoJobRequest, current_user: CurrentUser, db: DbSession
    ) -> Job:
        """Enqueue a slow echo job so you can watch the worker pick it up. DEV ONLY."""
        job_id = await enqueue(
            db, kind="demo_echo", payload=payload.model_dump()
        )
        return await db.get(Job, job_id)
