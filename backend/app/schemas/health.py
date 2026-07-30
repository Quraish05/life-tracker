from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str


class ReadinessResponse(BaseModel):
    """Readiness result: overall status plus a per-dependency breakdown."""

    status: str  # "ready" | "not ready"
    checks: dict[str, str]  # e.g. {"database": "ok" | "unreachable"}
