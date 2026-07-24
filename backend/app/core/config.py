from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    project_name: str = "Life Tracker API"
    version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False

    # Comma-separated list of allowed CORS origins.
    cors_origins: list[str] = ["http://localhost:3000"]

    # Async SQLAlchemy connection string (asyncpg driver).
    database_url: str = "postgresql+asyncpg://quraish@localhost:5432/life_tracker"

    # JWT signing. Override secret_key in every real environment via the .env file.
    secret_key: str = "dev-secret-change-me-in-production-0123456789abcdef"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # Web Push (VAPID). Generate a keypair and set these in .env. The private
    # key is a secret and must NEVER be committed; empty keys disable push.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    # The "sub" VAPID claim — a mailto: or https: contact for your service.
    vapid_subject: str = "mailto:admin@life-tracker.local"

    # Background reminder dispatch (server-side push). Off by default so the
    # dev server / tests don't spawn the loop; enable it in the environment
    # that should actually deliver pushes. Requires the VAPID keys above.
    push_dispatch_enabled: bool = False
    push_dispatch_interval_seconds: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
