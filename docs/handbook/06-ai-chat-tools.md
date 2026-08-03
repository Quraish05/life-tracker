# Chapter 11 — Agentic tool use (the streaming chat assistant)

**Last updated:** 2026-08-03 · **Status:** ✅ current with `feat/chat-tools` (PR #36, merged)

**Why we did this.** Every AI feature before this one is a *one-shot structured
call*: send a prompt, get back a fixed JSON shape, done ([Ch 10](05-ai-nutrition-estimation.md)).
That teaches structured output, but it's not how modern AI products actually
behave. The chat assistant is the first feature where the model **drives**: it
holds a conversation, decides *when* to act, calls the app's own actions to log a
meal or set a reminder, reads the result, and keeps going until it has an answer.
It's the reference implementation for the two capabilities the structured
features don't exercise — **streaming** and **tool use** — and it's the piece of
this codebase that most directly maps onto the CCAF agentic-AI domains (4.1–4.4).

**What the feature does.** `POST /chat` takes the conversation so far (plain-text
turns) plus the user's timezone and streams back the assistant's reply as
**Server-Sent Events**. Mid-reply the model can call four tools scoped to the
current user — `log_meal`, `log_exercise`, `create_reminder`, `query_day` — and
the UI echoes each action as a chip as it happens. It's Anthropic-only by design,
pinned to Haiku, ephemeral (no history is stored server-side), and it spends
exactly one AI credit per successful turn.

---

## 11.1 Mental model — the model is the loop, not a function

> A structured call is a **function**: one input, one validated output, the
> server is in control. A chat turn is a **loop the model drives**: the server
> hands the model a set of tools and a running transcript, and the model decides
> — turn by turn — whether to *talk* or *act*. The server's job flips from
> "produce an answer" to "run the loop faithfully and safely": stream what the
> model says, execute what it asks for, feed results back, and stop when it's done
> (or when a safety valve trips).

Four ideas worth internalizing before reading the code:

- **Two new capabilities, one feature.** *Streaming* means the client sees tokens
  as they're generated, not after a 5-second wait — essential once a turn can fan
  out into several model calls. *Tool use* means the model emits a structured
  request to call a named action, we run it, and we return the result as another
  message. Both are first-class on Anthropic, which is *why this feature is
  Anthropic-only* while the structured features stay provider-agnostic.
- **Tools are a contract, exactly like structured output.** Each tool advertises
  a JSON Schema for its inputs (`TOOLS` in [chat_tools.py](../../backend/app/services/chat_tools.py));
  the model fills that shape, we validate/coerce it, run the action, and hand back
  a text result. Same "model proposes against a hard contract" discipline as Ch 10
  — just in both directions and repeated.
- **The transcript is the state.** There's no session object. The client replays
  the whole plain-text history each turn; the tool_use/tool_result blocks live
  only *inside* the server's loop for that turn and are never sent back to the
  client. The Messages API is stateless, so "conversation" is just an
  ever-growing `messages` array we rebuild each request.
- **Writes auto-execute because they're cheap to undo.** Logging a meal or setting
  a reminder is low-stakes and reversible, and the user sees every action echoed
  in the UI, so there's no per-tool approval gate. A destructive tool (delete,
  bulk edit) would change that calculus — see §11.7.

---

## 11.2 The contract — tools in, transcript through

Two schema surfaces matter. First, **what crosses the wire** between browser and
server ([chat.py schema](../../backend/app/schemas/chat.py)) — deliberately
minimal, only plain text:

```python
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)  # full history, replayed
    timezone: str = "UTC"                                             # resolves "tomorrow 6pm"
```

Second, **what the model is offered** — the tool schemas in
[chat_tools.py](../../backend/app/services/chat_tools.py). Each is a name +
description + `input_schema` (JSON Schema), kept small and typed so the model
fills exact shapes. `log_meal` is the representative one:

```python
{
    "name": "log_meal",
    "description": "Log a food the user ate into a meal slot on a day. If the named "
                   "food isn't in their library yet, it's created automatically. …",
    "input_schema": {
        "type": "object",
        "properties": {
            "food_name": {"type": "string", "description": "What they ate, …"},
            "slot": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]},
            "date": {"type": "string", "description": "Day as YYYY-MM-DD. Omit for today."},
            "note": {"type": "string", "description": "Optional portion/note, …"},
        },
        "required": ["food_name", "slot"],   # the model must commit to these two
    },
}
```

Three things to notice:

- **The description *is* the API.** The model chooses a tool from its prose
  description ("Use when the user says they ate/had something"), so the
  description does the work a docstring does for a human. `date` is documented as
  optional-defaults-to-today so the model doesn't invent one.
- **Every executor returns one shape** — a `ToolOutcome(result, summary, ok)`.
  `result` is the text handed *back to the model* (so it can confirm or recover);
  `summary` is the one-line label the *UI* renders in a chip ("Logged Greek
  yogurt · breakfast · today"); `ok` flags failure. One dataclass serves two very
  different audiences.
- **`execute_tool` never raises.** Bad tool name, bad input, DB error — all come
  back as `ok=False` with an error `result`, so the model gets to apologize and
  retry instead of the HTTP stream 500-ing mid-reply.

---

## 11.3 The flow, both directions

```
Chat page ── user hits send ─────────────────────────────────────────────────┐
 chat/page.tsx: streamChat(messages, tz, handlers)                            │
   fetch POST /api/v1/chat  (ReadableStream, not EventSource — needs auth hdr) │
        │                                                                      │
        ▼                                                                      │
 routes/chat.py::chat                                                          │
   1. chat_configured()?          → 503 if no ANTHROPIC_API_KEY                │
   2. last message is user?       → 422 otherwise                             │
   3. enforce_ai_quota(user)      → 429 if the free pool is spent             │
   4. StreamingResponse(event_stream(), media_type="text/event-stream")       │
        │            on_complete = charge  (records 1 credit, success only)    │
        ▼                                                                      │
 services/chat.py::stream_chat   ← the manual tool-use loop                    │
   convo = [plain-text turns from the client]                                  │
   repeat up to _MAX_TOOL_ROUNDS (6):                                          │
     client.messages.stream(model=haiku, tools=TOOLS, messages=convo)          │
        └─► async for text in stream.text_stream:                             │
                yield  {"type":"text","text": …}  ──────────────────────────► │ (streams live
        final = await stream.get_final_message()                              │  to the UI)
        convo.append(assistant turn: text + any tool_use blocks)               │
        if final.stop_reason != "tool_use":  break   ← model gave a final answer│
        for each tool_use block:                                               │
            outcome = await execute_tool(name, input, user, db, tz, today)      │
            yield  {"type":"tool","name","summary","ok"}  ───────────────────► │ (tool chip)
            collect tool_result(tool_use_id, outcome.result, is_error=!ok)     │
        convo.append(user turn: [tool_result, …])   ← feed results back        │
   await on_complete()            → +1 credit, ONLY here (success path)        │
   yield {"type":"done"}          ─────────────────────────────────────────► │
        │  (on any APIError/Exception: yield {"type":"error", …} and return)   │
        ▼                                                                      │
 lib/chat.ts::streamChat  parses SSE frames off the ReadableStream:            │
   text → append to the streaming bubble · tool → push a chip ────────────────┘
   done → finalize turn · error → show message (+ status for quota)
```

**Forward (browser → model).** The chat page ([page.tsx](../../frontend/src/app/(app)/chat/page.tsx))
calls `streamChat` ([chat.ts](../../frontend/src/lib/chat.ts)), which POSTs the
whole transcript with a `fetch` + `ReadableStream` reader. It deliberately does
**not** use `EventSource`: that API can't POST a body or send an
`Authorization` header, both of which we need. It hand-parses SSE frames
(split on the blank-line separator, keep `data:` lines, `JSON.parse` each) and
fans them out to `onText` / `onTool` / `onDone` / `onError`. It returns an
`abort()` so the UI can cancel an in-flight turn.

**The loop (server).** [`stream_chat`](../../backend/app/services/chat.py) opens
`client.messages.stream(...)`, streams every text delta straight to the client,
then awaits `get_final_message()` to see the model's `stop_reason`. If it's
**not** `tool_use`, the model gave a final answer and we break. If it **is**, we
run each requested tool via `execute_tool`, emit a `tool` frame per action (so
the UI shows a chip immediately), and append the results as a single `user` turn
of `tool_result` blocks — then loop for the model's next move. A well-behaved
turn is one or two rounds; `_MAX_TOOL_ROUNDS = 6` stops a misbehaving model from
looping forever.

**Back (model → UI).** Text frames append to the current assistant bubble as they
arrive; tool frames render as chips inline in the thread; `done` finalizes the
turn and refreshes the quota badge; `error` shows a message (and, for a non-OK
HTTP response, the status — so the UI can distinguish a 429 quota block from a
transient failure).

---

## 11.4 The tricky part — running the tool loop faithfully

The heart of the feature is ~50 lines in `stream_chat`. Three mechanisms carry
the weight, and each is a place a naive implementation goes wrong.

**1. Streaming *and* getting the final message.** The Anthropic stream helper
lets you do both: iterate `stream.text_stream` for live deltas, then call
`await stream.get_final_message()` for the assembled turn — including the
non-text `tool_use` blocks, which never appear in `text_stream`. We need both:
the deltas for UX, the final message to decide whether to loop and which tools to
run.

```python
async with client.messages.stream(
    model=model, max_tokens=settings.ai_max_output_tokens,
    system=system, tools=TOOLS, messages=convo,
) as stream:
    async for text in stream.text_stream:
        yield _sse({"type": "text", "text": text})
    final = await stream.get_final_message()

convo.append({"role": "assistant", "content": final.content})  # text + tool_use blocks
if final.stop_reason != "tool_use":
    break
```

**2. The transcript has to be rebuilt exactly.** The Messages API is stateless, so
"conversation" is an array we grow by hand, and the shape is strict: the
assistant's turn (with its `tool_use` blocks) must be echoed back verbatim, and
the tool outputs must come back as a **`user`** turn of `tool_result` blocks whose
`tool_use_id` matches the call. Get the pairing wrong and the next request 400s.

```python
tool_results = []
for block in final.content:
    if block.type != "tool_use":
        continue
    outcome = await execute_tool(block.name, dict(block.input),
                                 user=user, db=db, tz=tz, today=today)
    yield _sse({"type": "tool", "name": block.name,
                "summary": outcome.summary, "ok": outcome.ok})
    tool_results.append({
        "type": "tool_result",
        "tool_use_id": block.id,          # ← must match the call
        "content": outcome.result,        # ← what the model reads next
        "is_error": not outcome.ok,       # ← lets the model recover
    })
convo.append({"role": "user", "content": tool_results})
```

**3. Errors end the stream cleanly, they never raise.** Once headers are sent
(`StreamingResponse` has started), you can't turn a failure into a 500 — the
client is already reading a 200 body. So the whole loop is wrapped: an
`anthropic.APIError` or any unexpected exception is logged server-side and turned
into a single `{"type": "error"}` frame, and the generator returns. The stream
always terminates in exactly one of `done` or `error`. This is the streaming
analogue of Ch 10's `ai_errors_as_http` — same intent (don't leak a stack trace,
give the client something actionable), different mechanism because we're
mid-stream.

---

## 11.5 Cost control & configuration — quota once, Haiku always

- **One credit per turn, on success only.** The route enforces quota up front
  (`enforce_ai_quota`, 429 over the cap) but charges via `on_complete`, which
  `stream_chat` calls *only* on the success path, just before `done`. A turn that
  fans out into six model calls still costs **one** credit; a turn that dies
  mid-stream costs **zero** — matching the "charge after the work succeeds" rule
  from every other AI feature ([Ch 10 §10.5](05-ai-nutrition-estimation.md)). This
  is why the charge lives in a success-only callback and not a `finally`.
- **Pinned to Haiku, on purpose.** `_CHAT_MODEL = "claude-haiku-4-5"`, independent
  of the `AI_MODEL` the structured features use. A conversational turn can trigger
  several model calls through the tool loop, so pinning the cheapest tool-capable
  model keeps per-turn cost predictable.
- **Anthropic-only, decoupled from `AI_PROVIDER`.** `chat_configured()` returns
  `bool(settings.anthropic_api_key)` — it does **not** consult `AI_PROVIDER`. So
  chat works on an Anthropic key even when the structured features are pointed at
  Gemini (`AI_PROVIDER=gemini`). This decoupling was a deliberate fix: chat needs
  streaming + tool use, which we only wire for Anthropic. `anthropic_client()`
  ([ai_client.py](../../backend/app/services/ai_client.py)) exposes the cached
  `AsyncAnthropic` the structured path already builds.
- **SSE plumbing headers.** The response sets `Cache-Control: no-cache` and
  `X-Accel-Buffering: no` so an intermediary (nginx) doesn't buffer the stream and
  defeat the whole point.

---

## 11.6 How to run & test

```bash
cd backend
# Chat needs an Anthropic key specifically (works even if AI_PROVIDER=gemini):
#   ANTHROPIC_API_KEY=sk-ant-…
uv run pytest tests/test_chat_tools.py -v     # each tool's behavior, scoped to the user
uv run pytest tests/test_chat_stream.py -v    # the loop: frames emitted, quota charged once
```

The tool tests exercise the executors against a real test DB (find-or-create a
food, localize a naive reminder time, read back a day). The stream tests
**fake the Anthropic client** with a scripted sequence of turns (a `tool_use`
turn, then a final text turn) and assert the *wiring*: that text/tool/done frames
come out in order, that a successful turn charges exactly one credit, and that a
turn ending in an error frame charges **zero**. No network, no real model.

Manual end-to-end: open **Assistant** in the nav, then try "I had a chicken
salad for lunch", "remind me to stretch tomorrow at 7am", "what did I log today".

---

## 11.7 Gotchas

- **`EventSource` can't do this.** It can't POST a body or set an auth header, so
  the frontend uses `fetch` + a `ReadableStream` reader and parses SSE by hand.
  Don't "simplify" it back to `EventSource`.
- **Charge in `on_complete`, never `finally`.** A `finally` would bill users for a
  turn that errored mid-stream. The credit is recorded only on the success path,
  right before the `done` frame.
- **`tool_result` is a `user` turn, and ids must match.** The tool outputs go back
  as `role: "user"` content (not `assistant`), and each `tool_result.tool_use_id`
  must equal the `tool_use.id` from the model's turn. Mismatch → the next request
  400s.
- **Errors after headers can't be HTTP errors.** Once the stream starts you must
  emit an `error` *frame*; you can't raise an `HTTPException`. Pre-stream checks
  (config/quota/shape) still return real status codes — do those before returning
  the `StreamingResponse`.
- **The safety valve is not optional.** Without `_MAX_TOOL_ROUNDS`, a model that
  keeps asking for tools would loop until it exhausts `max_tokens` budget or the
  request times out. Six rounds is generous for the real tools.
- **Writes auto-execute — keep the tools low-stakes.** The no-approval design
  holds only because every tool is cheap to undo and echoed to the user. Adding a
  `delete_*` or bulk-edit tool means adding a confirmation gate first.
- **History is capped and ephemeral.** `messages` is limited to 40 turns and
  8000 chars each; nothing is persisted server-side. Long conversations silently
  lose their oldest turns on the client — fine for a helper, not for anything that
  needs recall (that's the RAG chapter, not this one).

---

## 11.8 Future enhancements

- **More tools, same loop.** The loop is tool-agnostic; new capabilities are just
  new entries in `TOOLS` + `_EXECUTORS` (create a task, summarize a week, start a
  routine). The interesting work is the *description* wording, not the plumbing.
- **Approval gate for destructive actions.** Introduce a "confirm" step for any
  tool that deletes or bulk-edits — emit a `confirm` frame, pause the loop, resume
  on the user's yes. This is where the Tool Runner's per-turn hooks (or a manual
  equivalent) would earn their keep.
- **Grounded answers (RAG).** `query_day` reads one day structurally; the planned
  RAG feature would let the assistant answer "how did my eating trend this month"
  by retrieving over the notes/meals corpus rather than a single day.
- **Persisted conversations.** A `conversations`/`messages` table would enable
  recall and multi-device continuity — at the cost of the current
  zero-storage simplicity. Only worth it once users ask.
- **Provider-agnostic chat.** If Gemini tool-use + streaming is ever wired into
  the shared engine, `chat_configured()` and `anthropic_client()` are the two
  seams to generalize — the loop itself is mostly provider-shaped already.
```
