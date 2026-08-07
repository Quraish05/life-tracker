from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed_password.encode())


def create_access_token(subject: str | int) -> str:
    """Create a signed JWT whose ``sub`` claim identifies the user."""
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(subject), "iat": now, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT, raising ``jwt.PyJWTError`` on any failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def verify_google_id_token(credential: str) -> dict:
    """Verify a Google Sign-In ID token and return its claims.

    Checks the token's signature against Google's public certs and that its
    ``aud`` matches our configured client ID. Raises ``ValueError`` on any
    failure (bad signature, wrong audience, expired). Returns the claims dict
    (``email``, ``email_verified``, ``name``, ``sub``, …).
    """
    return id_token.verify_oauth2_token(
        credential, google_requests.Request(), settings.google_client_id
    )
