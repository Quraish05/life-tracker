# Chapter 12 — Retrieval-augmented journal (hybrid RAG)

**Last updated:** 2026-08-05 · **Status:** ✅ current with `feat/journal-rag` (Slice 12)

**Why we did this.** The product thesis is *"your day, in one place — and an AI
that has actually read it."* We had structured-output AI ([Ch 10](05-ai-nutrition-estimation.md))
and agentic tool use ([Ch 11](06-ai-chat-tools.md)), but nothing that **retrieved
and grounded** answers in the user's own writing. This is the first RAG feature:
ask a question in plain English — "how has my sleep been?", "when did I write
about movies?" — and get a prose answer built from, and citing, the actual
journal entries it drew from.

**What the feature does.** `POST /journal/ask` takes a question, runs **hybrid
retrieval** over the user's journal (semantic vector search + Postgres full-text
search, fused), hands the top few entries to the model, and returns a grounded
answer plus **citations** — the specific entries it used, rendered as chips that
open the entry. Embeddings run **locally and free** (no API key); only the final
answer costs a provider call (one AI credit, on success).

---

## 12.1 Mental model — retrieve first, then ground

> A structured feature ([Ch 10](05-ai-nutrition-estimation.md)) sends the model a
> prompt and trusts the answer. RAG never trusts the model with the *facts*: it
> **retrieves** the relevant source text from the database first, then asks the
> model to answer *only from that text* and report which pieces it used. The
> model supplies fluency; the database supplies truth. If retrieval finds
> nothing, the feature says so instead of letting the model invent.

Four ideas to hold before the code:

- **Two indexes, one question.** A journal entry is findable two ways: by
  *meaning* (a vector near the question's vector) and by *words* (a full-text
  match). We use **both arms** and fuse them — "hybrid search". The word arm is
  the same Postgres FTS from [Ch 9](04-full-text-search.md); the meaning arm is
  new (pgvector).
- **Embeddings are local and free.** Retrieval needs to turn text into vectors.
  We do that on-device with `sentence-transformers` (`all-MiniLM-L6-v2`, 384
  dims) — no API, no key, no per-call cost. Only the *answer* uses a paid
  provider.
- **The index is derived data.** `note_chunks` is rebuilt from `notes`; it's
  never a source of truth. A journal save re-embeds that entry (best-effort); a
  backfill CLI rebuilds everything. Losing it costs one reindex, no data.
- **Grounding is enforced by the prompt + the schema.** The model is told to use
  only the excerpts and to return `used_note_ids`; citations come from that list,
  so we cite exactly what it leaned on — and an empty list is a clean "not in
  your journal."

---

## 12.2 The data model — `note_chunks`

Retrieval reads a new table ([note_chunk.py](../../backend/app/models/note_chunk.py)),
added alongside a pgvector extension in the migration
([a1cd7157ccfd](../../backend/alembic/versions/a1cd7157ccfd_note_chunks_pgvector.py)):

```python
class NoteChunk(Base):
    __tablename__ = "note_chunks"
    id: Mapped[int] = mapped_column(primary_key=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    chunk_text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(384))   # ← pgvector column
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_note_chunks_embedding", "embedding",
              postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"}),
    )
```

- **`Vector(384)`** is the pgvector column type; 384 is `all-MiniLM-L6-v2`'s
  output dim. The migration runs `CREATE EXTENSION IF NOT EXISTS vector` before
  building the table.
- **The HNSW index** (`vector_cosine_ops`) makes cosine nearest-neighbour search
  fast; the `<=>` operator uses it. (At 43 rows an exact scan would do — the index
  is here for correctness at scale and because it's the point of learning pgvector.)
- **`ondelete CASCADE`** on `note_id` means deleting a journal entry drops its
  chunks automatically — no cleanup code.

---

## 12.3 The flow, both directions

```
INDEXING (write path)                         ASKING (read path)
─────────────────────                         ──────────────────
notes.py::create/update_note                  journal page: AskJournal → useAskJournal
  save the note (commit)                        POST /api/v1/journal/ask
        │                                             │
        ▼                                             ▼
journal_index.reindex_note_safe               routes/journal.py::ask_journal
  (journal-only, best-effort)                   enforce_ai_quota → ai_errors_as_http:
        │                                             │
        ▼                                             ▼
  chunk_entry(note)  ── per-entry,             journal_qa.answer_question
    split long ones                              1. no chunks?  → no-data, NO model call, NO charge
        │                                          2. retrieve(db, user, question)   ┐
        ▼                                          3. empty?    → no-data, NO charge  │ hybrid
  embeddings.embed_texts (local)                   4. generate_structured(answer)     │ retrieval
        │                                          5. citations = used_note_ids       ┘   ↓
        ▼                                             │                          ┌─────────────────┐
  INSERT note_chunks (Vector 384)                     ▼                          │ retrieve():     │
                                              record_ai_usage (only if step 4)   │  dense arm  ─┐   │
  backfill: scripts/reindex_journal.py         return {answer, citations, model} │  lexical arm─┼RRF│
                                                      │                          │  fuse → floor│   │
                                                      ▼                          │  → MMR → top5│   │
                                              AskJournal renders answer +        └─────────────────┘
                                              citation chips → open drawer
```

**Write path.** Saving a journal entry ([notes.py](../../backend/app/api/routes/notes.py))
calls `reindex_note_safe`, which re-embeds just that entry so search stays fresh.
It's best-effort: a failed embed logs and rolls back the chunk change but never
fails the save.

**Read path.** The Journal page's `AskJournal` box POSTs the question; the route
enforces quota, calls `answer_question`, and charges a credit **only if a model
call actually happened** (the no-data paths are free). The answer + citations
stream back and render, with each citation chip opening the cited entry in the
existing preview drawer.

---

## 12.4 How it works — indexing, chunking, ranking

Before the code, the three concepts that make RAG *work*. Each maps to a chapter
in the [`rag-practice`](https://github.com/Quraish05/rag-practice) notes, linked
inline for the deeper theory.

### Indexing — turning entries into searchable vectors

**Indexing** is the *offline* step: it converts each journal entry into rows in
`note_chunks` so that, at ask-time, we're searching a pre-built index instead of
re-reading every entry. For each journal entry we **chunk → embed → store**:

```
each journal entry
   → chunk_entry()        → [chunk texts]
   → embeddings.embed_texts()  → [384-dim vectors]   (local, one-time cost)
   → INSERT note_chunks   → HNSW index kept up to date
```

Two things make it robust:

- **Two triggers.** *On write* — saving a journal entry re-indexes just that entry
  (`reindex_note_safe`, best-effort) so it's immediately searchable. *Bulk* —
  `scripts/reindex_journal.py` rebuilds everything (used after the migration or a
  schema change).
- **Idempotent + derived.** Re-indexing a note *deletes its old chunks then
  re-inserts* — never appends duplicates. `note_chunks` is derived from `notes`,
  so it's safe to drop and rebuild at any time; the only cost is one re-embed.

The embedding is computed **once, at index time**. That's the whole efficiency
trick of RAG: asking is cheap because only the short *question* is embedded live —
the corpus was embedded already. (Theory: [rag-practice · 02-rag-pipeline.md](https://github.com/Quraish05/rag-practice/blob/main/handbook/02-rag-pipeline.md).)

### Chunking — the unit you retrieve and cite

A **chunk** is the smallest piece the system retrieves and cites. Its size is a
trade-off: chunks too *large* dilute relevance and stuff the prompt with noise;
too *small* and a fragment loses the meaning that made it worth finding. There are
several strategies — fixed-size, recursive, semantic, agentic (all walked through
in [rag-practice · 01-chunking.md](https://github.com/Quraish05/rag-practice/blob/main/handbook/01-chunking.md)).

Here the corpus makes the choice easy: **journal entries are already short**
(avg ~400 chars, max ~1800), and an entry is a natural, self-contained thought —
so the rule is **one chunk per entry**, and a citation cleanly points at "the
entry". Only long entries are split:

```
chunk_entry(note):
  title, body = note.title.strip(), note.body_md.strip()
  if len(body) <= 1200:                 → one chunk: "{title}\n\n{body}"
  else:                                  → split on blank lines (paragraphs),
                                            greedily pack up to ~1200 chars,
                                            prepend the title to each chunk
  drop any empty chunk
```

Two deliberate choices: the **title is prepended** to every chunk's embedded text,
so a strong title signal ("Rough sleep") contributes even when the body doesn't
repeat the word; and long entries split on **paragraph boundaries**, never
mid-sentence, so a chunk always reads as a coherent piece.

### Ranking — from ~40 candidates down to the best 5

**Ranking** is where hybrid RAG earns its keep: it decides, out of every entry,
which 5 the model actually sees. It runs as a funnel, each stage re-ordering or
narrowing:

```
   dense arm  (cosine, top 20) ─┐
                                ├─ RRF fuse ─→ relevance floor ─→ MMR ─→ top 5 excerpts
   lexical arm (FTS,   top 20) ─┘   (by rank)   (drop irrelevant)  (diversify)
```

1. **Two arms rank independently.** *Dense* ranks by **meaning** — cosine distance
   between the question vector and each chunk vector (`embedding <=> query`),
   nearest 20. *Lexical* ranks by **words** — Postgres `ts_rank_cd` over the FTS
   index, top 20. Each catches hits the other misses (dense finds "finished a
   film" for "movies"; lexical nails an exact rare term the embedder blurs).
2. **Fuse with RRF.** The two arms' raw scores aren't comparable (a cosine
   distance vs. a `ts_rank`), so we fuse on **rank position only**:
   `score(id) = Σ 1/(k + rank)` across both lists (`k = 60`). An entry that ranks
   well in *both* arms beats one that's strong in only one. This is exactly the
   ensemble/RRF technique from [rag-practice · 06-hybrid-search.md](https://github.com/Quraish05/rag-practice/blob/main/handbook/06-hybrid-search.md)
   (see its `ensemble-retriever-rrf-with-weights.png`).
3. **Relevance floor.** Drop fused candidates whose best cosine similarity is
   below `0.15` — *unless* they came from the lexical arm (a keyword match is its
   own relevance signal). If nothing clears either bar, the query is unrelated to
   the whole journal → the feature returns a clean "nothing found" and never calls
   the model.
4. **MMR for diversity.** Greedily pick 5, each maximising
   `λ·(relevance to query) − (1−λ)·(similarity to already-picked)`, `λ = 0.7`, so
   five near-identical "sleep" entries don't crowd out the answer. (MMR and other
   advanced retrieval passes: [rag-practice · 05-advanced-retrieval.md](https://github.com/Quraish05/rag-practice/blob/main/handbook/05-advanced-retrieval.md).)
5. **Reranking — deliberately *not* here.** A cross-encoder re-scoring the
   shortlist is the classic next precision step, but it needs a model that doesn't
   fit this stack cleanly, so it's a fast-follow (§12.10). Theory:
   [rag-practice · 07-reranking.md](https://github.com/Quraish05/rag-practice/blob/main/handbook/07-reranking.md).

The next section is the same five steps **in code**. (Term refresher any time:
[rag-practice · glossary.md](https://github.com/Quraish05/rag-practice/blob/main/handbook/glossary.md), or §12.9 below.)

---

## 12.5 The tricky part — hybrid retrieval (code walkthrough)

This is the heart of the chapter. Everything lives in
[journal_qa.py](../../backend/app/services/journal_qa.py), and it runs in this
order.

**1. Embed the question (local).** [embeddings.py](../../backend/app/services/embeddings.py)
loads the model once and encodes on a worker thread (encoding is blocking CPU work):

```python
@lru_cache(maxsize=1)
def _model() -> "SentenceTransformer":
    from sentence_transformers import SentenceTransformer   # lazy: keep torch out of startup
    return SentenceTransformer(EMBED_MODEL)                 # "all-MiniLM-L6-v2"

async def embed_query(text: str) -> list[float]:
    (vector,) = await embed_texts([text])                  # → 384-dim unit vector
    return vector
```

**2. The dense arm — pgvector cosine.** Nearest chunks by cosine distance (`<=>`),
scoped to the user, deduped to note ids in rank order:

```python
async def _dense_ranked(db, user_id, qvec) -> list[int]:
    dist = NoteChunk.embedding.cosine_distance(qvec)       # the <=> operator
    rows = (await db.execute(
        select(NoteChunk.note_id).where(NoteChunk.user_id == user_id)
        .order_by(dist).limit(_DENSE_K)                     # _DENSE_K = 20
    )).scalars()
    seen = []
    for note_id in rows:
        if note_id not in seen:
            seen.append(note_id)
    return seen
```

**3. The lexical arm — Postgres FTS.** The same generated `search_vector` +
`ts_rank_cd` from [Ch 9](04-full-text-search.md), scoped to journal entries:

```python
async def _lexical_ranked(db, user_id, question) -> list[int]:
    tsquery = func.websearch_to_tsquery("english", question)
    rank = func.ts_rank_cd(Note.search_vector, tsquery)
    rows = (await db.execute(
        select(Note.id).where(
            Note.user_id == user_id, Note.kind == "journal",
            Note.search_vector.op("@@")(tsquery),
        ).order_by(rank.desc(), Note.updated_at.desc()).limit(_LEXICAL_K)
    )).scalars()
    return list(rows)
```

**4. Fuse with Reciprocal Rank Fusion.** Each arm returns a *ranked list*; RRF
scores an id by `1/(k + rank)` summed across the lists it appears in. An id found
by both arms outranks one found by either alone — and the two scores are
comparable without normalising cosine distances against FTS ranks (the reason RRF
is the standard fusion for hybrid search):

```python
def rrf_fuse(*ranked_lists: list[int], k: int = _RRF_K) -> dict[int, float]:  # _RRF_K = 60
    scores: dict[int, float] = {}
    for ranked in ranked_lists:
        for rank, note_id in enumerate(ranked):
            scores[note_id] = scores.get(note_id, 0.0) + 1.0 / (k + rank + 1)
    return scores
```

**5. Hydrate + relevance floor.** Pull each candidate's best chunk (text +
embedding + cosine similarity) in one query, then filter. A candidate stays if
it's semantically close enough **or** it was a full-text hit — a keyword match is
its own relevance signal, so lexical hits bypass the semantic floor; when nothing
clears either bar the query is unrelated to the whole corpus → no-data:

```python
lexical_set = set(lexical)
candidates = [
    hydrated[nid] for nid in top_ids
    if nid in hydrated
    and (hydrated[nid].similarity >= _MIN_SIMILARITY or nid in lexical_set)   # floor = 0.15
]
if not candidates:
    return []
return _mmr_select(candidates, _TOP_K)                                        # _TOP_K = 5
```

**6. MMR for diversity.** The seeded journal has many near-identical "sleep"
entries; naive top-k would return five of them. Maximal Marginal Relevance
greedily picks results that are relevant to the query *but* different from what's
already picked (embeddings are unit vectors, so cosine similarity is a dot
product):

```python
def _mmr_select(candidates, k, lambda_=_MMR_LAMBDA):        # _MMR_LAMBDA = 0.7
    pool, selected = list(candidates), []
    while pool and len(selected) < k:
        best_i, best_score = 0, None
        for i, cand in enumerate(pool):
            redundancy = max((_dot(cand.embedding, s.embedding) for s in selected), default=0.0)
            score = lambda_ * cand.similarity - (1 - lambda_) * redundancy
            if best_score is None or score > best_score:
                best_score, best_i = score, i
        selected.append(pool.pop(best_i))
    return selected
```

`retrieve()` chains these — dense + lexical → `rrf_fuse` → hydrate + floor → MMR —
and returns up to 5 excerpts. It takes `(db, user, question)` and knows nothing
about HTTP **on purpose**, so the planned `search_journal` chat tool can reuse it
verbatim.

---

## 12.6 Grounded generation + citations

`answer_question` short-circuits before any model call when there's nothing to
answer from (so the route charges no credit), then grounds the model on the
retrieved excerpts via the provider-agnostic `generate_structured`
([Ch 10 §10.4](05-ai-nutrition-estimation.md)):

```python
async def answer_question(db, user, question) -> QaResult:
    has_any = await db.scalar(select(func.count()).select_from(NoteChunk)
                              .where(NoteChunk.user_id == user.id))
    if not has_any:
        return QaResult(_NO_ENTRIES, [], active_model(), used_model=False)   # free
    excerpts = await retrieve(db, user, question)
    if not excerpts:
        return QaResult(_NO_MATCH, [], active_model(), used_model=False)      # free

    result, model = await generate_structured(                               # AskJournalAnswer
        system=_SYSTEM_PROMPT,
        user_message=_build_user_message(question, excerpts),
        anthropic_schema=_ANSWER_SCHEMA, response_model=AskJournalAnswer,
    )
    by_id = {e.note_id: e for e in excerpts}
    used = [by_id[nid] for nid in result.used_note_ids if nid in by_id]       # precise citations
    citations = [Citation(note_id=e.note_id, entry_date=e.entry_date,
                          title=e.title, snippet=_snippet(e.chunk_text)) for e in used]
    return QaResult(result.answer, citations, model, used_model=True)
```

The output schema forces `{answer, used_note_ids}` — the model *reports which
excerpts it used*, so citations are the entries it actually leaned on, not every
retrieved candidate. An empty `used_note_ids` (the model saying "not covered")
yields no citations.

**The route** ([journal.py](../../backend/app/api/routes/journal.py)) is the
same choreography as every AI endpoint — quota up front, `ai_errors_as_http`
around the work — with one twist: charge only when the model ran.

```python
enforce_ai_quota(current_user)
with ai_errors_as_http("Could not answer that right now. Please try again."):
    result = await answer_question(db, current_user, payload.question)
if result.used_model:                       # no-data answers are free
    await record_ai_usage(current_user, db)
```

**The frontend** ([ask-journal.tsx](../../frontend/src/components/journal/ask-journal.tsx))
is a `useAskJournal` mutation (mirrors `useDailySummary`) with the standard quota
handling, plus citation chips whose `onClick` calls the page's `setSelectedId` to
open the existing `EntryPreviewDrawer` — no new navigation.

```tsx
<Chip tone="soft" size="sm" interactive asChild>
  <button onClick={() => onOpenEntry(c.note_id)} title={c.snippet}>
    {c.entry_date ? formatDayShort(c.entry_date) : "Undated"} · {c.title}
  </button>
</Chip>
```

---

## 12.7 How to run & test

```bash
cd backend
# One-time: pgvector must be installed for the running Postgres (see gotchas).
uv run alembic upgrade head                     # creates the extension + note_chunks + HNSW index
uv run python -m scripts.reindex_journal        # backfill: embeds all journal entries (first run downloads ~90MB model)
uv run pytest tests/test_journal_index.py tests/test_journal_retrieval.py tests/test_journal_qa.py -v
```

Tests **fake the embedder and the generator** (monkeypatch the names as imported
into the service, per [Ch 11](06-ai-chat-tools.md)'s stream tests) so they're
fast and offline. The interesting ones:

- `rrf_fuse` and `_mmr_select` are **pure** — a dense-only hit and a lexical-only
  hit both surface; a both-arms hit ranks top; MMR drops a near-duplicate.
- `retrieve` runs against **real Postgres** with crafted orthogonal unit-vector
  embeddings + a faked query vector, asserting the dense and lexical arms fuse.
- the route charges **one** credit on a real answer, **zero** on the no-data
  short-circuit.

Manual: Journal page → **Ask my journal** → "how has my sleep been?" → grounded
answer citing the June→July sleep-thread entries.

---

## 12.8 Gotchas

- **pgvector had to be built from source against Postgres 16.** The Homebrew
  `pgvector` bottle shipped extension files for pg **17/18 only**, so
  `CREATE EXTENSION vector` failed on the running pg16 (`vector.control` absent).
  Fix: compile against the running server —
  `make && make install PG_CONFIG=/opt/homebrew/opt/postgresql@16/bin/pg_config`
  — then restart Postgres. On Neon (prod) pgvector is available natively.
- **The test DB needs the extension too.** `conftest.py` builds the schema with
  `create_all`, which can't run `CREATE EXTENSION`; the fixture now issues
  `CREATE EXTENSION IF NOT EXISTS vector` before `create_all` so the harness stays
  self-sufficient.
- **Local embeddings = a torch dependency.** `sentence-transformers` pulls in
  torch (~200MB) and the first embed downloads the model. The upside is $0, no key,
  offline, and it exactly matches prior practice; the cost is container weight
  (swap to `fastembed`/ONNX later if deploy size bites). The import is lazy so
  startup and embed-free tests never load torch.
- **Provider split, on purpose.** *Embeddings* are local; *answer generation* uses
  the app's active AI provider via `generate_structured`. The two are independent
  engines — retrieval keeps working regardless of which chat/answer provider is
  configured.
- **5 of 6 AI features are provider-agnostic; chat is the exception.** Everything
  built on `generate_structured` (nutrition, day-summary, tag-suggest, follow-ups,
  and this RAG answer) runs on **either** Anthropic or Gemini by flipping
  `AI_PROVIDER` — zero code change. Only the **chat assistant** ([Ch 11](06-ai-chat-tools.md))
  is Anthropic-only (it uses the raw streaming + tool-use client, not
  `generate_structured`), so a Gemini-only setup leaves chat needing its own
  Anthropic key (or a port of its loop to `google-genai`).
- **`uvicorn --reload` doesn't re-read `.env`.** pydantic-settings loads `.env`
  once at startup; editing `AI_PROVIDER` or a key won't take effect until the
  server restarts (or you `touch app/main.py`). A stale key surfaces as a 502/503,
  which looks like a code bug but isn't.
- **Charge only when the model runs.** No-data answers (empty journal, nothing
  relevant) make no provider call, so they must not spend a credit — the route
  gates `record_ai_usage` on `result.used_model`.

---

## 12.9 Glossary

- **Embedding** — a fixed-length vector (here 384 numbers) representing a text's
  meaning, so "similar meaning" becomes "nearby vectors".
- **`sentence-transformers` / `all-MiniLM-L6-v2`** — a small, free, local model
  that turns text into 384-dim embeddings on-device (no API).
- **pgvector** — a Postgres extension adding a `vector` column type and
  nearest-neighbour operators (`<=>` = cosine distance).
- **Cosine distance / similarity** — how close two vectors point;
  `similarity = 1 - distance`. Magnitude-independent, so unit vectors compare by
  dot product.
- **HNSW** — Hierarchical Navigable Small World, an approximate-nearest-neighbour
  index that makes vector search fast at scale.
- **Chunking** — splitting a document into retrievable pieces. Journal entries are
  short, so it's ~one chunk per entry (long ones split on paragraphs).
- **Dense vs. lexical retrieval** — dense = by embedding similarity (meaning);
  lexical = by full-text keyword match (words).
- **Hybrid search** — running both arms and combining them, catching hits either
  alone would miss.
- **RRF (Reciprocal Rank Fusion)** — combines two ranked lists by summing
  `1/(k + rank)`; the standard way to fuse dense + lexical without normalising
  their scores.
- **MMR (Maximal Marginal Relevance)** — a selection pass that trades off
  relevance against diversity so near-duplicates don't dominate the results.
- **Grounding** — constraining the model to answer only from provided source text,
  not its own memory.
- **Citation** — the specific source entry an answer used, surfaced to the user
  (here via `used_note_ids`).

---

## 12.10 Future enhancements

- **`search_journal` chat tool** — the immediate fast-follow: wire the
  endpoint-agnostic `retrieve()` into the assistant's tools so it can answer
  journal questions conversationally (and combine with other tools).
- **Reranking / multi-query** — a cross-encoder rerank stage, or generating query
  reformulations, for higher precision on harder questions.
- **Eval harness** — a golden-set of question → expected-source-entry cases in CI,
  plus tracing (the CCAF evals domain).
- **Broaden the corpus** — retrieve over notes/meals/workouts, not just journal
  entries.
- **Background indexing** — move re-embedding off the write path to a worker for
  large edits.
