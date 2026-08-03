"""Request schema for the chat assistant.

Conversations are stateless/ephemeral: the client holds the history and replays
it each turn (the Messages API is stateless anyway). Only plain-text turns cross
the wire — the tool_use/tool_result blocks of a turn live server-side within that
turn and aren't echoed back to the client.
"""

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    """A chat turn: the full conversation so far plus the user's IANA timezone.

    ``timezone`` lets the assistant resolve relative times ("tomorrow 6pm") and
    default dates to the user's local "today".
    """

    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    timezone: str = "UTC"
