from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Job lifecycle. A job is born ``queued``, the worker flips it to ``running``
# while its handler executes, then to ``done`` (with a ``result``) or ``failed``
# (with an ``error``). A failed job whose ``attempts`` haven't hit
# ``max_attempts`` goes back to ``queued`` with a pushed-out ``run_at`` instead.
JOB_QUEUED = "queued"
JOB_RUNNING = "running"
JOB_DONE = "done"
JOB_FAILED = "failed"


class Job(Base):
    """A unit of work that runs outside a web request.

    This is the one primitive behind both "do it later, on a schedule" and
    "do it now, but don't make the user wait". A row *is* the work order: what
    to run (``kind`` -> a handler in the jobs registry), the data to run it
    with (``payload``), and when it's eligible (``run_at``). A background worker
    loop (see ``app/services/jobs/worker.py``, started in the app lifespan)
    claims due rows, runs their handler, and records the outcome.

    ``run_at`` in the future = a scheduled job; ``run_at`` now = fire ASAP.
    ``dedupe_key`` is how recurring schedules stay idempotent: each occurrence
    enqueues under a unique key (``cron:<kind>:<iso-time>``), so a worker that
    wakes twice for the same tick can't double-enqueue it.
    """

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Which handler runs this. Indexed because listing/filtering by kind is common.
    kind: Mapped[str] = mapped_column(String(64), index=True)
    # Arbitrary JSON input for the handler.
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    # Lifecycle state — see the JOB_* constants above. Indexed with run_at
    # because the worker's "what's due?" query filters on both.
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=JOB_QUEUED, index=True
    )
    # Earliest time this job may run. Indexed: the worker sleeps until the
    # minimum run_at across all queued jobs.
    run_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    # How many times the worker has started this job, and the ceiling. A handler
    # that raises is retried (queued again) until attempts == max_attempts.
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    # Handler output on success; NULL otherwise.
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None)
    # Last error string on failure; NULL otherwise.
    error: Mapped[str | None] = mapped_column(Text, default=None)
    # When the worker most recently claimed the row (for observability/stuck-job detection).
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    # Idempotency key for recurring/scheduled occurrences. NULL for one-off jobs
    # (Postgres allows many NULLs under a UNIQUE constraint, so they never collide).
    dedupe_key: Mapped[str | None] = mapped_column(String(200), unique=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
