# Chapter 9 — Full-text search over notes

**Last updated:** 2026-07-30 · **Status:** ✅ current with `feat/notes-full-text-search`

**Why we did this.** Listing notes newest-first stops scaling the moment you have
more than a screenful — you can't *find* the entry where you wrote about being
"exhausted". This adds real search: type a word, get the notes that mean it,
best match first. It's also the deliberate warm-up for RAG (Ch — planned): once
you've felt keyword search's limits, semantic retrieval's payoff is obvious.

**What the feature does.** `GET /notes/search?q=…` returns the current user's
notes matching a query, ranked by relevance, each with a highlighted snippet. It
uses **Postgres full-text search** — no external search engine, no extra infra.

---

## 9.1 Mental model — Postgres maintains a search index for you

> A note carries a hidden **`tsvector`** — its text reduced to normalized
> *lexemes* ("running", "runs", "ran" → `run`). It's a **generated column**:
> Postgres recomputes it on every insert/update, so nothing in the app keeps it
> in sync. A **GIN index** over that column turns search from a table scan into
> an index lookup. A query is turned into a `tsquery` and matched with `@@`.

Two consequences worth internalizing:

- Search matches **lexemes, not substrings**. Searching `run` finds "running";
  searching `un` finds nothing. This is a feature — it's *meaning of words*, not
  `LIKE '%un%'`.
- Because the vector is generated and indexed, **write code stays untouched** —
  creating or editing a note needs no search-specific logic at all.

---

## 9.2 The schema change — a generated, weighted `tsvector`

In [note.py](../../backend/app/models/note.py) the column and its GIN index are
declared on the model, so `create_all` (tests) and the migration
([7711394bba36](../../backend/alembic/versions/7711394bba36_add_notes_full_text_search_vector.py))
stay in lockstep:

```python
search_vector: Mapped[str | None] = mapped_column(
    TSVECTOR,
    Computed(
        "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
        "setweight(to_tsvector('english', coalesce(body_md, '')), 'B')",
        persisted=True,
    ),
    nullable=True,
    deferred=True,
)
__table_args__ = (Index("ix_notes_search_vector", "search_vector", postgresql_using="gin"),)
```

- **`setweight(..., 'A')` on title, `'B'` on body** — a title hit outranks a body
  hit at rank time.
- **`persisted=True`** → a `STORED` generated column. This requires the
  expression be *immutable*, which is exactly why we use the **2-arg**
  `to_tsvector('english', …)` (the 1-arg form depends on a runtime setting and
  is only *stable*, so Postgres rejects it here).
- **`deferred=True`** — ordinary note queries don't drag the vector back; it's
  only touched during search.

---

## 9.3 The query — build it in one place

[note_search.py](../../backend/app/services/note_search.py):

```python
tsquery = func.websearch_to_tsquery("english", query)
rank = func.ts_rank_cd(Note.search_vector, tsquery)
snippet = func.ts_headline("english", Note.body_md, tsquery, _HEADLINE_OPTS)

stmt = (
    select(Note, rank.label("rank"), snippet.label("snippet"))
    .where(Note.user_id == user_id, Note.search_vector.op("@@")(tsquery))
    .order_by(rank.desc(), Note.updated_at.desc())
    .limit(limit)
)
```

- **`websearch_to_tsquery`** gives users Google-ish syntax — `"quoted phrases"`,
  `or`, `-exclude` — and never raises on junk input (unlike `to_tsquery`).
- **`@@`** is the match operator (`search_vector @@ tsquery`).
- **`ts_rank_cd`** scores relevance; ties break on most-recently-updated.
- **`ts_headline`** returns a body excerpt with matches wrapped in `<mark>`.
- An empty/whitespace query short-circuits to `[]` — no pointless round trip.

---

## 9.4 The route — mind the ordering

In [notes.py](../../backend/app/api/routes/notes.py), `/search` is declared
**before** `/{note_id}`. FastAPI matches routes in order; since `note_id` is an
`int`, a request to `/notes/search` would otherwise be tried against
`/{note_id}`, fail int-conversion, and 422 instead of reaching search. Order
fixes it. The route maps each `(Note, rank, snippet)` row to a `NoteSearchHit`
(a `NoteRead` plus `rank` and `snippet`).

---

## 9.5 Testing FTS — the first real-Postgres harness

FTS is pure Postgres, so it **cannot** be tested with fakes or SQLite. This slice
introduced [conftest.py](../../backend/tests/conftest.py):

- Schema built once per session from the ORM models (`create_all`), dropped at
  the end — no migrations to run in tests.
- Each test gets a `db` session wrapped in a transaction that is **rolled back**
  on teardown (`join_transaction_mode="create_savepoint"`, so even a mid-test
  `commit()` is undone). Tests never pollute each other.

Target DB: `TEST_DATABASE_URL`, else `database_url` with `_test` appended. The
tests in [test_note_search.py](../../backend/tests/test_note_search.py) prove
ranking (title beats body), per-user scoping, `<mark>` snippets, and the
`-exclude` syntax — all against real Postgres. **This same harness is what RAG
will reuse for pgvector.**

---

## 9.6 How to run & test

```bash
cd backend
createdb life_tracker_test            # one-time
uv run alembic upgrade head           # apply the FTS migration to your dev DB
uv run pytest tests/test_note_search.py -v
```

---

## 9.7 Gotchas

- **Immutable `to_tsvector`** — a `STORED` generated column needs the 2-arg
  form; the 1-arg form fails to create.
- **Route ordering** — `/search` must precede `/{note_id}` (see §9.4).
- **Lexemes, not substrings** — partial-word searches don't match by design.
- **Language config** — we index as `'english'`, so stemming/stop-words are
  English. Non-English content still stores, but stems less usefully.

---

## 9.8 Future enhancements

- **Extend to meals & dishes** — the same generated-column pattern drops onto
  `meals.description` / dish text for a unified search.
- **Semantic search (RAG)** — keyword search can't find "tired" when you wrote
  "exhausted". That's the next slice: embeddings + pgvector for meaning-based
  retrieval, reusing the test harness this chapter introduced. This chapter is
  the keyword baseline that makes that contrast concrete.
