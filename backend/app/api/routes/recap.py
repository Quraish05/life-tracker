"""The "week in review" recap — read the latest, and refresh it via a job.

The stats are precomputed (by the scheduled Monday job or a previous refresh)
and stored one-per-user, so ``GET /recap/weekly`` is instant. ``refresh``
enqueues a background ``weekly_recap`` job and returns a job id the client polls
via ``status`` — that's the live queued -> running -> done flow. Refreshing is
pure aggregation, so it never spends an AI credit.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.models.job import Job
from app.models.weekly_recap import WeeklyRecap
from app.schemas.weekly_recap import RecapJobStatus, WeeklyRecapRead
from app.services.jobs.queue import enqueue

router = APIRouter(prefix="/recap", tags=["recap"])

_JOB_KIND = "weekly_recap"
JOB_NOT_FOUND = "No such recap job for this user."


@router.get(
    "/weekly",
    response_model=WeeklyRecapRead | None,
    summary="Get the current user's latest week-in-review (null if never generated)",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def get_weekly_recap(current_user: CurrentUser, db: DbSession) -> WeeklyRecap | None:
    """Return the stored recap for the user, or null if none has been generated yet."""
    return await db.scalar(
        select(WeeklyRecap).where(WeeklyRecap.user_id == current_user.id)
    )


@router.post(
    "/weekly/refresh",
    response_model=RecapJobStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue a background job to recompute the week-in-review",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def refresh_weekly_recap(current_user: CurrentUser, db: DbSession) -> RecapJobStatus:
    """Kick off a recap refresh off the request path; poll ``status`` for the result."""
    job_id = await enqueue(db, kind=_JOB_KIND, payload={"user_id": current_user.id})
    return RecapJobStatus(job_id=job_id, status="queued")


@router.get(
    "/weekly/status/{job_id}",
    response_model=RecapJobStatus,
    summary="Poll a recap-refresh job's status",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def get_recap_job_status(
    job_id: int, current_user: CurrentUser, db: DbSession
) -> RecapJobStatus:
    """Return a recap job's status, scoped to the caller (via the job's payload)."""
    job = await db.get(Job, job_id)
    if job is None or job.kind != _JOB_KIND or job.payload.get("user_id") != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=JOB_NOT_FOUND)
    return RecapJobStatus(job_id=job.id, status=job.status)
