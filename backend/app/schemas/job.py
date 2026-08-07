from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class JobRead(BaseModel):
    """A background job, as surfaced to the dev observability endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    status: str
    run_at: datetime
    attempts: int
    max_attempts: int
    payload: dict[str, Any]
    result: dict[str, Any] | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class DemoJobRequest(BaseModel):
    """Optional knobs for the demo job (dev endpoint)."""

    message: str = "hello from the job runner"
    delay_seconds: float = 3
