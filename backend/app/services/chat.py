"""The chat assistant — a streaming, tool-using loop over the Anthropic API.

This is the app's first *conversational* AI feature (the others are one-shot
structured calls). It demonstrates the two capabilities the structured features
don't: **streaming** (tokens are pushed to the client as they're generated) and
**tool use** (the model calls the app's own actions — see ``chat_tools``).

Shape: a manual ``while stop_reason == "tool_use"`` loop. Each iteration streams
the assistant's text to the caller, then — if the model asked for tools — runs
them against the user's data and feeds the results back for another round, until
the model produces a final answer. Anthropic-only on purpose (streaming + tool
use is first-class there and the app defaults to that provider); the structured
features remain provider-agnostic.

Emits Server-Sent Events as JSON objects, one per ``data:`` frame:
- ``{"type": "text", "text": <delta>}`` — a chunk of the assistant's reply
- ``{"type": "tool", "name", "summary", "ok"}`` — a tool ran (for the UI to echo)
- ``{"type": "done"}`` — the turn is complete
- ``{"type": "error", "message"}`` — something failed; the turn is over
"""

import json
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import datetime
from zoneinfo import ZoneInfo

from anthropic import APIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.schemas.chat import ChatMessage
from app.services.ai_client import anthropic_client
from app.services.chat_tools import TOOLS, execute_tool

logger = logging.getLogger(__name__)

# Chat is pinned to Haiku — the cheapest tool-capable model — regardless of the
# ``AI_MODEL`` used for the structured features, to keep conversational cost
# predictable (a chat turn can fan out into several model calls via the tool loop).
_CHAT_MODEL = "claude-haiku-4-5"

# Safety valve on the tool loop — a well-behaved turn needs one or two rounds;
# this stops a misbehaving model from looping forever.
_MAX_TOOL_ROUNDS = 6


def chat_configured() -> bool:
    """Whether the chat assistant can run.

    Chat is Anthropic-only *by design* (streaming + tool use is first-class
    there), independent of which provider the structured features use — so it
    needs only an Anthropic key, even when ``AI_PROVIDER`` is ``gemini``.
    """
    return bool(settings.anthropic_api_key)


def _resolve_tz(name: str) -> ZoneInfo:
    """Best-effort IANA timezone; fall back to UTC on anything unrecognized."""
    try:
        return ZoneInfo(name)
    except Exception:  # noqa: BLE001 — bad/unknown tz shouldn't 500 the turn
        return ZoneInfo("UTC")


def _system_prompt(now_local: datetime, tz_name: str) -> str:
    return (
        "You are the Thyme assistant — a friendly helper inside a personal "
        "day-tracking app. You can log meals and exercises, set reminders, and look "
        "up what the user logged on a day, using the provided tools.\n\n"
        f"Current date and time: {now_local:%A, %B %d, %Y at %I:%M %p} ({tz_name}).\n"
        f"Today's date is {now_local:%Y-%m-%d}.\n\n"
        "When the user asks to log, add, record, or be reminded of something, CALL "
        "the matching tool rather than only describing it. Resolve relative dates and "
        "times ('today', 'tomorrow 6pm', 'last night') against the current time above, "
        "and pass reminder times as ISO-8601 with the user's UTC offset. After a tool "
        "runs, confirm what you did in one short sentence. For questions unrelated to "
        "tracking, just answer normally without tools. Keep replies concise and warm."
    )


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


async def stream_chat(
    messages: list[ChatMessage],
    *,
    user: User,
    db: AsyncSession,
    timezone: str,
    on_complete: Callable[[], Awaitable[None]] | None = None,
) -> AsyncIterator[str]:
    """Run one chat turn, yielding SSE frames as text streams and tools run.

    Assumes the provider is configured (the route checks quota up front); on a
    model/API failure it emits an ``error`` frame and returns rather than raising,
    so the HTTP stream always ends cleanly. ``on_complete`` runs only on the
    success path (just before ``done``) — so a failed turn never burns a credit,
    matching the other AI features' "charge after the work succeeds" rule.
    """
    tz = _resolve_tz(timezone)
    now_local = datetime.now(tz)
    today = now_local.date()
    model = _CHAT_MODEL
    system = _system_prompt(now_local, timezone)
    client = anthropic_client()

    # Plain-text history from the client; tool blocks are appended in-loop.
    convo: list[dict] = [{"role": m.role, "content": m.content} for m in messages]

    try:
        for _ in range(_MAX_TOOL_ROUNDS):
            async with client.messages.stream(
                model=model,
                max_tokens=settings.ai_max_output_tokens,
                system=system,
                tools=TOOLS,
                messages=convo,
            ) as stream:
                async for text in stream.text_stream:
                    yield _sse({"type": "text", "text": text})
                final = await stream.get_final_message()

            # Echo the assistant turn (text + any tool_use blocks) back into history.
            convo.append({"role": "assistant", "content": final.content})

            if final.stop_reason != "tool_use":
                break

            tool_results: list[dict] = []
            for block in final.content:
                if block.type != "tool_use":
                    continue
                outcome = await execute_tool(
                    block.name, dict(block.input), user=user, db=db, tz=tz, today=today
                )
                yield _sse({
                    "type": "tool",
                    "name": block.name,
                    "summary": outcome.summary,
                    "ok": outcome.ok,
                })
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": outcome.result,
                        "is_error": not outcome.ok,
                    }
                )
            convo.append({"role": "user", "content": tool_results})

        if on_complete is not None:
            await on_complete()
        yield _sse({"type": "done"})
    except APIError:
        logger.exception("Chat stream failed (Anthropic API error)")
        yield _sse({"type": "error", "message": "The assistant hit a problem. Please try again."})
    except Exception:  # noqa: BLE001 — never leak a stack trace onto the stream
        logger.exception("Chat stream failed (unexpected error)")
        yield _sse({"type": "error", "message": "Something went wrong. Please try again."})
