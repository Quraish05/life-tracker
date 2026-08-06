# Life Tracker — Engineering Handbook

> A living book about *how this app actually works* — the implementations, the
> decisions behind them, and the full-stack learnings picked up building each
> feature. Where [BUILD-PLAN.md](../BUILD-PLAN.md) says what we intend to build,
> this handbook says how the built thing behaves once the code is real.

**Audience:** future-me, and anyone reading the code cold. Every chapter is
meant to be read start-to-finish like a book, and to leave you able to trace a
feature end-to-end (frontend → backend → database and back) without opening ten
files first.

**How to read a chapter:** each one follows the same spine — *mental model →
data model → the flow both directions → the tricky part in depth → how to run
& test → gotchas → future enhancements.*

---

## Table of Contents

### Part I — Foundations
- 🚧 **Ch 0. Architecture at a glance** — the stack, the repo layout, how a request travels _(planned)_
- 🚧 **Ch 1. Auth & sessions** — JWT, the token store, the `CurrentUser` dependency _(planned)_
- 🚧 **Ch 2. The data model** — users, notes, reminders, and the "log against a day" idea _(planned)_

### Part II — Features
- ✅ **[Ch 3. Reminders](01-reminders.md)** — time-based nudges, and two independent delivery systems (foreground poll + background Web Push), including the adaptive dispatch loop
- ✅ **[Ch 4. Notes & journal](07-notes-and-journal.md)** — one table, three faces (journal / note / checklist); folders vs. tags, the Notes/Journal page split, and the JSONB checklist PATCH edge
- ✅ **[Ch 9. Full-text search](04-full-text-search.md)** — Postgres FTS over notes: a generated `tsvector` column, GIN index, ranked results, and the first real-Postgres test harness
- ✅ **[Ch 10. AI nutrition estimation](05-ai-nutrition-estimation.md)** — schema-constrained structured output: the "✨ Ask AI" estimator, the shared provider engine, validate-and-retry, and quota/failure mapping
- ✅ **[Ch 11. Agentic tool use (chat assistant)](06-ai-chat-tools.md)** — the streaming, tool-using chat: a manual `stop_reason == "tool_use"` loop over SSE, four user-scoped tools, and quota/cost control (the CCAF agentic-AI reference)
- ✅ **[Ch 12. Retrieval-augmented journal (hybrid RAG)](08-journal-rag.md)** — "Ask my journal": pgvector + local embeddings, hybrid dense+FTS retrieval fused with RRF, MMR diversity, and grounded cited answers (the CCAF retrieval/grounding reference)
- ✅ **[Ch 13. Goals dashboard & the Goal Evaluator](09-goals-dashboard.md)** — the `/goal` page as a progress dashboard: deterministic (free) metrics — time-based progress, food-join tallies, seven-day alignment — plus one on-demand, quota-charged AI evaluator (score, readout, helping/hurting, one adjustment)

### Part III — Cross-cutting concerns
- 🚧 **Ch 5. Background work** — the in-process asyncio loop pattern, lifespan wiring, and when you'd outgrow it _(planned)_
- 🚧 **Ch 6. Real-time & push** — service workers, VAPID, and the browser push protocol _(planned)_
- ✅ **[Ch 7. Real-time live-sync (WebSockets)](02-live-sync-websockets.md)** — one socket per tab, a per-user broadcast registry, and pushing cache-invalidations so a change on one device updates another
- ✅ **[Ch 8. Observability](03-observability.md)** — structured logging (structlog + stdlib unified), per-request correlation ids, and the liveness/readiness health split

### Appendices
- 🚧 **A. Local dev & environment** — running backend + frontend, the shared dev Postgres gotcha _(planned)_
- 🚧 **B. Testing patterns** — async SQLAlchemy + `httpx.AsyncClient`, and why `TestClient` fights the event loop _(planned)_

---

**Legend:** ✅ written · 🚧 planned (stub the chapter when you build/learn the thing).

**Conventions**
- Code links are relative to this file, so they work on GitHub and in the editor.
- "Today" in a chapter means the date on its _Last updated_ line, not literally now.
- When the code and this book disagree, the code is right — fix the book.
