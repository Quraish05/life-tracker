"""Structured logging setup (structlog).

``configure_logging()`` wires structlog **and** the stdlib ``logging`` module
through one shared processor pipeline, so every log line comes out in the same
shape no matter who emitted it:

* our own ``structlog.get_logger(...)`` calls,
* stdlib ``logging.getLogger(__name__)`` calls already scattered in the app
  (e.g. ``main.py``, ``bootstrap.py``, ``reminder_dispatch.py``),
* and the noisy third parties — uvicorn and SQLAlchemy.

In development the renderer is a pretty, coloured console line; in production it
is one JSON object per line, which a log aggregator can index. The ``request_id``
bound by :class:`app.api.middleware.RequestContextMiddleware` (via
``structlog.contextvars``) is merged into every record automatically, so you can
grep a single request across every line it produced.
"""

import logging
import sys

import structlog

from app.core.config import settings

# Processors applied to *every* record — structlog-native and stdlib "foreign"
# ones alike — before the final renderer. Order matters: context first, then the
# metadata, then exception rendering.
_SHARED_PROCESSORS: list = [
    structlog.contextvars.merge_contextvars,  # request_id et al. from middleware
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
]


def configure_logging() -> None:
    """Configure structlog + stdlib logging. Idempotent; call once at startup."""
    json_logs = settings.environment == "production"
    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if json_logs
        else structlog.dev.ConsoleRenderer()
    )

    # structlog-native loggers: run the shared chain, then hand the event dict to
    # the stdlib formatter (below) rather than rendering here — so structlog and
    # stdlib records share one output path.
    structlog.configure(
        processors=[
            *_SHARED_PROCESSORS,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # The single stdlib formatter that actually renders. ``foreign_pre_chain``
    # gives records that originated in plain ``logging`` (uvicorn, SQLAlchemy)
    # the same context/metadata processing before rendering.
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=_SHARED_PROCESSORS,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())

    # uvicorn installs its own handlers; strip them and let its records propagate
    # to our root handler, so access/error lines match everything else and aren't
    # printed twice.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uv_logger = logging.getLogger(name)
        uv_logger.handlers.clear()
        uv_logger.propagate = True
