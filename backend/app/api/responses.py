"""Helpers for documenting error responses in OpenAPI / Swagger."""

from fastapi import status
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


def not_found_response(description: str, detail: str) -> dict:
    """OpenAPI ``responses`` entry for a 404 (resource missing or not the caller's).

    Each router pairs this with its own message, e.g.
    ``not_found_response("No such note for this user", NOTE_NOT_FOUND)``.
    """
    return {status.HTTP_404_NOT_FOUND: error_response(description, detail)}
