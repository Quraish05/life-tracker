"""Build and maintain the journal RAG index (``note_chunks``).

Journal entries are chunked and embedded locally (see ``app.services.embeddings``)
into ``note_chunks`` rows, which back hybrid semantic + lexical retrieval
(``journal_qa``). Entries are short, so chunking is ~one chunk per entry, splitting
only long entries on paragraph boundaries. The index is *derived data*:
``reindex_note`` is idempotent (replace-in-place) and safe to re-run any time.
"""

import logging

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.models.note_chunk import NoteChunk
from app.services.embeddings import embed_texts

logger = logging.getLogger(__name__)

# Entries longer than this get split into paragraph-packed chunks; shorter ones
# stay whole. Journal entries average ~400 chars, so most are a single chunk.
_MAX_CHUNK_CHARS = 1200


def chunk_entry(note: Note) -> list[tuple[int, str]]:
    """Split a journal note into ``(chunk_index, text)`` pairs to embed.

    The title is prepended to each chunk so it contributes to retrieval. Short
    entries yield one chunk; long ones split on blank lines, packing paragraphs
    up to ~``_MAX_CHUNK_CHARS``. Chunks with no text are dropped.
    """
    title = (note.title or "").strip()
    body = (note.body_md or "").strip()

    def _with_title(text: str) -> str:
        if title and text:
            return f"{title}\n\n{text}"
        return title or text

    if len(body) <= _MAX_CHUNK_CHARS:
        pieces = [_with_title(body)]
    else:
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        packed: list[str] = []
        current = ""
        for para in paragraphs:
            if current and len(current) + len(para) + 2 > _MAX_CHUNK_CHARS:
                packed.append(current)
                current = para
            else:
                current = f"{current}\n\n{para}" if current else para
        if current:
            packed.append(current)
        pieces = [_with_title(text) for text in packed]

    return [(i, text) for i, text in enumerate(p for p in pieces if p.strip())]


async def reindex_note(db: AsyncSession, note: Note) -> int:
    """Rebuild the ``note_chunks`` for one note; returns the chunk count.

    Deletes any existing chunks for the note, then re-chunks, embeds, and inserts.
    Meaningful only for journal entries (the RAG corpus) — callers gate on kind.
    Commits the change.
    """
    await db.execute(delete(NoteChunk).where(NoteChunk.note_id == note.id))

    pieces = chunk_entry(note)
    if not pieces:
        await db.commit()
        return 0

    vectors = await embed_texts([text for _, text in pieces])
    for (idx, text), vector in zip(pieces, vectors, strict=True):
        db.add(
            NoteChunk(
                note_id=note.id,
                user_id=note.user_id,
                chunk_index=idx,
                chunk_text=text,
                embedding=vector,
            )
        )
    await db.commit()
    return len(pieces)


async def reindex_all_journal(
    db: AsyncSession, *, user_id: int | None = None
) -> tuple[int, int]:
    """Reindex every journal entry (optionally scoped to one user).

    Returns ``(notes_indexed, chunks_written)``. Used by the backfill CLI and tests.
    """
    stmt = select(Note).where(Note.kind == "journal")
    if user_id is not None:
        stmt = stmt.where(Note.user_id == user_id)
    notes = list(await db.scalars(stmt))

    total_chunks = 0
    for note in notes:
        total_chunks += await reindex_note(db, note)
    return len(notes), total_chunks


async def reindex_note_safe(db: AsyncSession, note: Note) -> None:
    """Best-effort reindex for the write path: never raises, journals only.

    A failed embed (e.g. model still downloading) must not fail the user's save —
    the next edit or the backfill CLI catches up. Rolls back the partial index
    change and logs, leaving the already-committed note untouched.
    """
    if note.kind != "journal":
        return
    try:
        await reindex_note(db, note)
    except Exception:  # noqa: BLE001 — indexing must never break a note save
        logger.exception("Journal reindex failed for note %s", note.id)
        await db.rollback()
