"""Helpers for documenting error responses in OpenAPI / Swagger."""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Shape of an error body returned by ``HTTPException``."""

    detail: str


def error_response(description: str, example: str) -> dict:
    """Build an OpenAPI ``responses`` entry for a JSON error with a ``detail`` message."""
    return {
        "model": ErrorResponse,
        "description": description,
        "content": {"application/json": {"example": {"detail": example}}},
    }
