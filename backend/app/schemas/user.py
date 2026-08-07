from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.core.config import settings
from app.models.user import ROLE_SUPERADMIN


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class GoogleAuthRequest(BaseModel):
    """Google Sign-In payload: the ID token (a JWT) issued by Google Identity
    Services in the browser. The backend verifies it against Google's certs."""

    credential: str = Field(min_length=1)


class UserLogin(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "alice@example.com",
                "password": "password123",
            }
        }
    )

    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: str
    ai_usage_count: int
    created_at: datetime

    @computed_field
    @property
    def ai_limit(self) -> int:
        """The free AI-call pool size (informational; superadmin ignores it)."""
        return settings.ai_free_limit

    @computed_field
    @property
    def ai_remaining(self) -> int | None:
        """Free AI calls left, or ``None`` when the user is unlimited."""
        if self.role == ROLE_SUPERADMIN:
            return None
        return max(0, settings.ai_free_limit - self.ai_usage_count)


class Token(BaseModel):
    """Auth response: a bearer token plus the authenticated user's profile."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
