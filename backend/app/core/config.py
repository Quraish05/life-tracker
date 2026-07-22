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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
