"""Test the chat streaming tool-loop without a real model.

A live Anthropic call needs a key and is non-deterministic, so we fake the
client: the loop is what we actually own (stream text → run a tool → feed the
result back → stream the final answer → done). The fake drives that exact path
and we assert on the SSE frames it emits and the row a tool actually wrote.
"""

import json

from sqlalchemy import select

from app.models.exercise_log import ExerciseLog
from app.models.user import User
from app.schemas.chat import ChatMessage
from app.services import chat as chat_service


class _Block:
    """Stand-in for an Anthropic content block (text or tool_use)."""

    def __init__(self, type: str, **kw) -> None:
        self.type = type
        self.__dict__.update(kw)


class _Final:
    def __init__(self, content: list, stop_reason: str) -> None:
        self.content = content
        self.stop_reason = stop_reason


class _FakeStream:
    """Async context manager mimicking ``client.messages.stream(...)``."""

    def __init__(self, chunks: list[str], final: _Final) -> None:
        self._chunks = chunks
        self._final = final

    async def __aenter__(self) -> "_FakeStream":
        return self

    async def __aexit__(self, *exc) -> bool:
        return False

    @property
    def text_stream(self):
        async def gen():
            for chunk in self._chunks:
                yield chunk

        return gen()

    async def get_final_message(self) -> _Final:
        return self._final


class _FakeMessages:
    def __init__(self, streams: list[_FakeStream]) -> None:
        self._streams = streams
        self._i = 0

    def stream(self, **_kwargs) -> _FakeStream:
        stream = self._streams[self._i]
        self._i += 1
        return stream


class _FakeClient:
    def __init__(self, streams: list[_FakeStream]) -> None:
        self.messages = _FakeMessages(streams)


async def _make_user(db) -> User:
    user = User(username="alice", email="alice@example.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


def _frames(sse_chunks: list[str]) -> list[dict]:
    """Parse ``data: {...}`` SSE strings into their JSON payloads."""
    out = []
    for chunk in sse_chunks:
        line = chunk.strip()
        assert line.startswith("data:")
        out.append(json.loads(line[len("data:") :].strip()))
    return out


async def test_stream_runs_tool_then_finishes(db, monkeypatch):
    user = await _make_user(db)

    # Round 1: the model streams a preamble, then asks to run log_exercise.
    round1 = _FakeStream(
        ["Sure, "],
        _Final(
            content=[
                _Block("text", text="Sure, "),
                _Block("tool_use", name="log_exercise", id="toolu_1", input={"name": "Run"}),
            ],
            stop_reason="tool_use",
        ),
    )
    # Round 2: with the tool result fed back, it streams the final confirmation.
    round2 = _FakeStream(
        ["Logged your run!"],
        _Final(content=[_Block("text", text="Logged your run!")], stop_reason="end_turn"),
    )
    monkeypatch.setattr(chat_service, "anthropic_client", lambda: _FakeClient([round1, round2]))

    charged = 0

    async def _charge() -> None:
        nonlocal charged
        charged += 1

    frames = _frames(
        [
            chunk
            async for chunk in chat_service.stream_chat(
                [ChatMessage(role="user", content="log a run")],
                user=user,
                db=db,
                timezone="UTC",
                on_complete=_charge,
            )
        ]
    )

    types = [f["type"] for f in frames]
    assert types == ["text", "tool", "text", "done"]
    assert charged == 1  # exactly one credit, charged on the success path

    tool_frame = frames[1]
    assert tool_frame["name"] == "log_exercise"
    assert tool_frame["ok"] is True

    assert frames[0]["text"] == "Sure, "
    assert frames[2]["text"] == "Logged your run!"

    # The tool actually wrote a row for this user.
    ex = await db.scalar(select(ExerciseLog).where(ExerciseLog.user_id == user.id))
    assert ex is not None
    assert ex.name == "Run"


async def test_stream_text_only_no_tools(db, monkeypatch):
    user = await _make_user(db)
    only = _FakeStream(
        ["Hello! "],
        _Final(content=[_Block("text", text="Hello! ")], stop_reason="end_turn"),
    )
    monkeypatch.setattr(chat_service, "anthropic_client", lambda: _FakeClient([only]))

    frames = _frames(
        [
            chunk
            async for chunk in chat_service.stream_chat(
                [ChatMessage(role="user", content="hi")], user=user, db=db, timezone="UTC"
            )
        ]
    )

    assert [f["type"] for f in frames] == ["text", "done"]


class _BoomStream:
    """A stream that fails on open — models a mid-turn API error."""

    async def __aenter__(self):
        raise RuntimeError("model exploded")

    async def __aexit__(self, *exc):
        return False


async def test_failed_turn_emits_error_and_does_not_charge(db, monkeypatch):
    user = await _make_user(db)

    class _BoomClient:
        messages = type("_M", (), {"stream": staticmethod(lambda **_: _BoomStream())})()

    monkeypatch.setattr(chat_service, "anthropic_client", lambda: _BoomClient())

    charged = 0

    async def _charge() -> None:
        nonlocal charged
        charged += 1

    frames = _frames(
        [
            chunk
            async for chunk in chat_service.stream_chat(
                [ChatMessage(role="user", content="hi")],
                user=user,
                db=db,
                timezone="UTC",
                on_complete=_charge,
            )
        ]
    )

    assert [f["type"] for f in frames] == ["error"]
    assert charged == 0  # a failed turn burns no credit
