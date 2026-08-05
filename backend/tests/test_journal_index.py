"""Journal RAG indexing — chunking (pure) and reindex_note wiring (fake embedder).

Embeddings are faked so these stay fast and offline; the real model is exercised
only via the manual backfill, not the suite.
"""

from datetime import date

from sqlalchemy import select

from app.models.note import Note
from app.models.note_chunk import NoteChunk
from app.models.user import User
from app.services import journal_index


def _journal(title: str, body: str) -> Note:
    return Note(
        user_id=1, kind="journal", title=title, body_md=body, entry_date=date(2026, 8, 1)
    )


def test_chunk_entry_short_is_single_chunk_with_title():
    chunks = journal_index.chunk_entry(_journal("Rough sleep", "Up at 3, couldn't sleep."))
    assert len(chunks) == 1
    idx, text = chunks[0]
    assert idx == 0
    assert "Rough sleep" in text  # title prepended so it contributes to retrieval
    assert "Up at 3" in text


def test_chunk_entry_long_splits_on_paragraphs_sequentially():
    para = "word " * 120  # ~600 chars
    note = _journal("Long day", "\n\n".join([para, para, para]))  # ~1800 chars
    chunks = journal_index.chunk_entry(note)
    assert len(chunks) >= 2
    assert [i for i, _ in chunks] == list(range(len(chunks)))  # 0-based, in order


def test_chunk_entry_empty_yields_nothing():
    assert journal_index.chunk_entry(_journal("", "")) == []


async def _make_user(db, name="idx") -> User:
    user = User(username=name, email=f"{name}@x.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def test_reindex_note_writes_chunks(db, monkeypatch):
    user = await _make_user(db)
    note = Note(
        user_id=user.id, kind="journal", title="Sleep", body_md="Slept well.",
        entry_date=date(2026, 8, 1),
    )
    db.add(note)
    await db.flush()

    async def fake_embed(texts):
        return [[0.1] * 384 for _ in texts]

    monkeypatch.setattr(journal_index, "embed_texts", fake_embed)

    count = await journal_index.reindex_note(db, note)
    assert count == 1

    rows = list(await db.scalars(select(NoteChunk).where(NoteChunk.note_id == note.id)))
    assert len(rows) == 1
    assert rows[0].user_id == user.id
    assert len(rows[0].embedding) == 384


async def test_reindex_note_replaces_not_appends(db, monkeypatch):
    user = await _make_user(db, "idx2")
    note = Note(
        user_id=user.id, kind="journal", title="A", body_md="first",
        entry_date=date(2026, 8, 1),
    )
    db.add(note)
    await db.flush()

    async def fake_embed(texts):
        return [[0.2] * 384 for _ in texts]

    monkeypatch.setattr(journal_index, "embed_texts", fake_embed)

    await journal_index.reindex_note(db, note)
    await journal_index.reindex_note(db, note)  # run twice

    rows = list(await db.scalars(select(NoteChunk).where(NoteChunk.note_id == note.id)))
    assert len(rows) == 1  # replaced in place, not duplicated
