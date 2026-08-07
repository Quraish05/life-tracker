from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    project_name: str = "Thyme API"
    version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False

    # "development" | "production". Controls how logs render: pretty, coloured
    # console lines in development; one JSON object per line in production, ready
    # for a log aggregator to parse. See app/core/logging.py.
    environment: str = "development"
    # Root log level for the app and its dependencies (uvicorn, SQLAlchemy).
    log_level: str = "INFO"

    # Comma-separated list of allowed CORS origins.
    cors_origins: list[str] = ["http://localhost:3000"]

    # Async SQLAlchemy connection string (asyncpg driver).
    database_url: str = "postgresql+asyncpg://quraish@localhost:5432/life_tracker"

    # JWT signing. Override secret_key in every real environment via the .env file.
    secret_key: str = "dev-secret-change-me-in-production-0123456789abcdef"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # Google Sign-In (SSO). The OAuth 2.0 "Web application" client ID from Google
    # Cloud Console. Public value (safe in the frontend too). Blank disables the
    # /auth/google endpoint (returns 503). The same value must be set on the
    # frontend as NEXT_PUBLIC_GOOGLE_CLIENT_ID so the browser and the backend
    # agree on the audience the ID token is verified against.
    google_client_id: str = ""

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
    # The dispatch loop sleeps until the next upcoming reminder is due, but
    # never longer than this. It's a safety net: it bounds how long an
    # un-deliverable/overdue reminder waits before a retry, and covers a wake
    # signal that never arrives (e.g. a reminder created in another worker
    # process, whose in-process signal can't reach this loop).
    push_dispatch_max_interval_seconds: int = 300

    # Background job runner (see app/services/jobs/). Off by default — like the
    # reminder dispatcher — so the dev server / tests don't spawn the loop;
    # enable it in the environment that should actually run background jobs
    # (and locally, set JOBS_WORKER_ENABLED=true to see the demo/heartbeat run).
    jobs_worker_enabled: bool = False
    # The worker sleeps until the next queued job is due, but never longer than
    # this — a safety net that also bounds how often recurring schedules get
    # their next occurrence enqueued. 60s so a once-a-minute schedule stays tight.
    jobs_worker_max_interval_seconds: int = 60
    # Max jobs claimed and run per tick.
    jobs_worker_batch_size: int = 10

    # AI features (structured extraction). Provider-swappable: set AI_PROVIDER to
    # "anthropic" or "gemini" and supply that provider's key. A missing key
    # disables the feature and the endpoints return 503. Gemini's flash tier is
    # free and its key is self-serve at aistudio.google.com.
    ai_provider: str = "anthropic"  # "anthropic" | "gemini"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    # Blank uses the provider's default model (see follow_up_extraction._DEFAULT_MODELS).
    ai_model: str = ""
    ai_max_output_tokens: int = 2048

    # AI usage quota (MVP cost control). Regular users get a lifetime pool of
    # this many AI calls shared across every AI feature; once spent, the AI
    # endpoints return 429 until they "upgrade" (no payment gateway yet, so the
    # cap is currently hard). The superadmin bypasses the limit entirely.
    ai_free_limit: int = 5
    # Email of the account promoted to superadmin on startup (unlimited AI,
    # for the maintainer's own testing). Blank = no superadmin.
    superadmin_email: str = ""

    @field_validator("database_url", mode="after")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        """Make a managed-Postgres URL usable by SQLAlchemy's asyncpg driver.

        Providers like Neon hand out ``postgres://…?sslmode=require`` (libpq
        style). asyncpg needs the ``postgresql+asyncpg`` scheme and the ``ssl``
        query key, and rejects ``channel_binding``. Normalizing here means both
        the app engine and Alembic (which read ``settings.database_url``) get a
        working URL straight from the provider's copy-paste string.
        """
        parts = urlsplit(value)
        scheme = parts.scheme
        if scheme in ("postgres", "postgresql"):
            scheme = "postgresql+asyncpg"

        query = []
        for key, val in parse_qsl(parts.query):
            if key == "sslmode":
                query.append(("ssl", val))
            elif key == "channel_binding":
                continue  # asyncpg doesn't accept this libpq option
            else:
                query.append((key, val))

        return urlunsplit(
            (scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
