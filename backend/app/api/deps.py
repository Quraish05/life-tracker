"""Shared FastAPI dependencies used across route modules."""

from typing import Annotated, TypeAlias

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

DbSession: TypeAlias = Annotated[AsyncSession, Depends(get_db)]

bearer_scheme = HTTPBearer(auto_error=True)

# Shared 401 message — referenced by handlers and in the API docs.
INVALID_TOKEN = "Could not validate credentials."


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    """Resolve the authenticated user from a Bearer JWT, or raise 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=INVALID_TOKEN,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None

    user = await db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUser: TypeAlias = Annotated[User, Depends(get_current_user)]
