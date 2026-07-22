from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
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
            detail=f"A user with this {field} already exists.",
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
        status.HTTP_404_NOT_FOUND: {
            "description": "No account exists for the given email",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "No account found for this email. Please register first."
                    }
                }
            },
        },
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Password does not match",
            "content": {
                "application/json": {"example": {"detail": "Incorrect email or password."}}
            },
        },
    },
)
async def login(payload: UserLogin, db: DbSession) -> User:
    """Authenticate a user by email and password, returning the user profile."""
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email. Please register first.",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    return user
