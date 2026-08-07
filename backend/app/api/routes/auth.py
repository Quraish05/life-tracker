import re

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.api.responses import error_response
from app.core.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from app.models.user import User
from app.schemas.user import (
    GoogleAuthRequest,
    Token,
    UserCreate,
    UserLogin,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Error messages — single source of truth for both the handlers and the API docs.
USER_EXISTS = "A user with this {field} already exists."
NO_ACCOUNT = "No account found for this email. Please register first."
BAD_CREDENTIALS = "Incorrect email or password."
GOOGLE_DISABLED = "Google Sign-In is not configured on this server."
GOOGLE_INVALID = "Could not verify your Google sign-in. Please try again."
GOOGLE_UNVERIFIED = "Your Google account has no verified email address."


async def _unique_username(db: AsyncSession, email: str) -> str:
    """Derive a unique, valid username from a Google account's email.

    Uses the email's local part, stripped to ``[a-z0-9_]`` and padded to the
    3–30 char rule, then appends a numeric suffix until it's unused.
    """
    base = re.sub(r"[^a-z0-9_]", "", email.split("@", 1)[0].lower()) or "user"
    if len(base) < 3:
        base = f"{base}user"
    base = base[:30]

    candidate, n = base, 0
    while await db.scalar(select(User.id).where(User.username == candidate)) is not None:
        n += 1
        suffix = str(n)
        candidate = f"{base[: 30 - len(suffix)]}{suffix}"
    return candidate


def _token_for(user: User) -> Token:
    """Build the auth response (JWT + profile) for a user."""
    return Token(access_token=create_access_token(user.id), user=UserRead.model_validate(user))


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    responses={
        status.HTTP_409_CONFLICT: error_response(
            "Username or email already taken", USER_EXISTS.format(field="email")
        ),
    },
)
async def register(payload: UserCreate, db: DbSession) -> Token:
    """Register a new user and return an access token (auto-login)."""
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
    return _token_for(user)


@router.post(
    "/login",
    response_model=Token,
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
async def login(payload: UserLogin, db: DbSession) -> Token:
    """Authenticate a user by email and password, returning an access token."""
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NO_ACCOUNT)
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=BAD_CREDENTIALS
        )
    return _token_for(user)


@router.post(
    "/google",
    response_model=Token,
    summary="Sign in (or sign up) with Google",
    responses={
        status.HTTP_401_UNAUTHORIZED: error_response(
            "The Google credential could not be verified", GOOGLE_INVALID
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE: error_response(
            "Google Sign-In is not configured", GOOGLE_DISABLED
        ),
    },
)
async def google_auth(payload: GoogleAuthRequest, db: DbSession) -> Token:
    """Verify a Google ID token, then log the user in — creating the account on
    first sign-in (find-or-create by email). SSO accounts have no password."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=GOOGLE_DISABLED
        )

    try:
        claims = verify_google_id_token(payload.credential)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=GOOGLE_INVALID
        ) from None

    email = (claims.get("email") or "").lower()
    if not email or not claims.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=GOOGLE_UNVERIFIED
        )

    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            username=await _unique_username(db, email),
            email=email,
            hashed_password=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return _token_for(user)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get the currently authenticated user",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def read_me(current_user: CurrentUser) -> User:
    """Return the profile of the user identified by the Bearer token."""
    return current_user


# --- Demo/dev only -------------------------------------------------------
#
# A convenience for local testing: reset the caller's AI usage so a demo user
# doesn't burn the small free pool. This route is registered ONLY when the
# environment is not "production", so in production it does not exist at all
# (404, and absent from the OpenAPI schema) — the frontend button is a
# secondary guard; this is the real one. To disable it, set ENVIRONMENT=production.
if settings.environment != "production":

    @router.post(
        "/dev/reset-ai-quota",
        response_model=UserRead,
        summary="[dev only] Reset the caller's AI quota to full",
        responses={**UNAUTHORIZED_RESPONSE},
    )
    async def reset_ai_quota(current_user: CurrentUser, db: DbSession) -> User:
        """Reset the signed-in user's AI usage count to 0 (full pool again).

        DEMO/DEV ONLY — not registered when ``ENVIRONMENT=production``.
        """
        current_user.ai_usage_count = 0
        await db.commit()
        await db.refresh(current_user)
        return current_user
