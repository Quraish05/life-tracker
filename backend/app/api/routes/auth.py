from typing import Annotated, TypeAlias

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import error_response
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession: TypeAlias = Annotated[AsyncSession, Depends(get_db)]

# Error messages — single source of truth for both the handlers and the API docs.
USER_EXISTS = "A user with this {field} already exists."
NO_ACCOUNT = "No account found for this email. Please register first."
BAD_CREDENTIALS = "Incorrect email or password."


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    responses={
        status.HTTP_409_CONFLICT: error_response(
            "Username or email already taken", USER_EXISTS.format(field="email")
        ),
    },
)
async def register(payload: UserCreate, db: DbSession) -> User:
    """Register a new user."""
    existing = await db.scalar(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.email)
        )
    )
    if existing is not None:
        field = "username" if existing.username == payload.username else "email"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=USER_EXISTS.format(field=field),
        )

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=UserRead,
    summary="Log in with email and password",
    responses={
        status.HTTP_404_NOT_FOUND: error_response(
            "No account exists for the given email", NO_ACCOUNT
        ),
        status.HTTP_401_UNAUTHORIZED: error_response(
            "Password does not match", BAD_CREDENTIALS
        ),
    },
)
async def login(payload: UserLogin, db: DbSession) -> User:
    """Authenticate a user by email and password, returning the user profile."""
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NO_ACCOUNT)
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=BAD_CREDENTIALS
        )
    return user
