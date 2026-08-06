# Thyme

> **Your day, in one place — and an AI that has actually read it.** · *every day, seasoned.*

Thyme is a full-stack personal-tracking app where everything — meals,
workouts, journal entries, reminders, goals — is a *log against a day*. Because
the app knows your days, its AI features (summaries, chat, retrieval, coaching)
have something real to reason about. One concept, one mental model, one **Today**
screen to start from.

It's also a deliberate learning project: every feature ships as a vertical slice
(model → migration → route → test → UI) and teaches one target skill. The
reasoning behind each is written up in the **[Engineering Handbook](docs/handbook/README.md)**.

---

## Features

**Track your day**
- **Today / Log an entry** — the day-centric home: what you ate, whether you
  trained, a journal box, what's due.
- **Food & meals** — a reusable food library with **AI nutrition estimation**
  (macros from a name + ingredients), plus per-day meal logging.
- **Workouts** — lightweight per-day exercise logging.
- **Reminders** — time-based nudges delivered two independent ways: a foreground
  poll and background **Web Push**, driven by an adaptive dispatch loop.

**Reflect**
- **Journal & Notes** — one table, three faces (journal / note / checklist), with
  folders, tags, and **Postgres full-text search**.
- **Ask my journal (RAG)** — ask in plain English and get a grounded, **cited**
  answer built from your own entries (hybrid semantic + keyword retrieval).
- **Patterns** — save an answer you like as a *finding*, with the entries it drew
  from as evidence and a "was this true for you?" vote.

**Plan**
- **Goals dashboard** — progress against your health goal (time-based progress,
  today's meals/workouts tallied against it, a seven-day alignment strip).
- **Goal Evaluator** — an on-demand AI read on the week: an alignment score,
  what's helping, what's working against you, and one adjustment.

**Woven through**
- **AI chat assistant** — a streaming, tool-using agent that answers over your
  own data.
- **Day summaries** — a structured on-track / off-track read on any day vs. your goal.
- **Live sync** — a change on one device updates another via WebSocket
  cache-invalidation.
- **Theming** — a "dusk plum" palette with light/dark modes.
- **AI quota** — a free-tier meter shared across every AI feature; calls are
  charged only when a model actually runs.

---

## Technologies used & explored

The stack was chosen as much to *learn* as to ship — several features exist to
explore a specific technology end-to-end.

**Backend**
- **Python 3.11+ · FastAPI · Pydantic v2** — async API, typed settings, service layer
- **SQLAlchemy 2 (async) · asyncpg · Alembic** — async ORM + migrations
- **PostgreSQL**, and two of its powers explored directly:
  - **Full-text search** — a generated `tsvector` column + GIN index, ranked results
  - **[pgvector](https://github.com/pgvector/pgvector)** — a `vector` column + **HNSW** index for semantic search
- **JWT auth** (PyJWT) + **bcrypt** password hashing
- **Web Push** (pywebpush / VAPID) + an in-process **asyncio background loop** for reminders
- **WebSockets** for real-time live-sync
- **structlog** structured logging with per-request correlation ids
- **ruff · pytest / pytest-asyncio** (with a real-Postgres test harness)

**AI / ML**
- **Anthropic Claude** and **Google Gemini** behind one provider-agnostic
  structured-output engine (schema-constrained JSON, validate-and-retry)
- **Retrieval-augmented generation (RAG)** — hybrid **dense + lexical** retrieval
  fused with **Reciprocal Rank Fusion**, **MMR** for diversity, grounded citations
- **sentence-transformers** (`all-MiniLM-L6-v2`) — local, free embeddings, no API cost
- **Agentic tool use** — a manual streaming `tool_use` loop over SSE with
  user-scoped tools

**Frontend**
- **Next.js 16 · React 19 · TypeScript**
- **TanStack Query** (server state) · **React Hook Form + Zod** (forms + validation)
- **Tailwind CSS v4** with a semantic-token theme · **Radix** primitives · **CVA**
- **react-markdown + remark-gfm**

**Infrastructure**
- Deployed on **Render** (API), **Neon** (Postgres), and **Vercel** (web) — see
  [`render.yaml`](render.yaml) and [docs/deployment.md](docs/deployment.md).

---

## Repository layout

```
backend/    FastAPI app — models, routes, services, Alembic migrations, tests
frontend/   Next.js app — App Router pages, components, TanStack Query hooks
docs/       Handbook (per-feature deep dives), build plan, decisions, deployment
```

## Docs

- **[Engineering Handbook](docs/handbook/README.md)** — how each feature actually
  works, end-to-end, with the decisions behind it
- **[Build Plan](docs/BUILD-PLAN.md)** — the product thesis and slice-by-slice roadmap
- **[Decisions log](docs/DECISIONS.md)** · **[Deployment](docs/deployment.md)**
