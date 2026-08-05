"""Schema + persistence tests for note folders and checklist items.

The folder/checklist rules live in `app/schemas/note.py` and mirror the frontend
Zod schema. Most of these are pure (no DB); the last one round-trips a checklist
through Postgres to prove the JSONB `items` column stores and reloads correctly.
"""

import pytest
from pydantic import ValidationError

from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate

# --- Folder normalization -------------------------------------------------


def test_folder_is_slugified():
    note = NoteCreate(kind="note", title="x", body_md="hi", folder="Eating Out")
    assert note.folder == "eating-out"


def test_blank_folder_becomes_none():
    note = NoteCreate(kind="note", title="x", body_md="hi", folder="   ")
    assert note.folder is None


# --- Checklist rules ------------------------------------------------------


def test_checklist_drops_blank_rows_and_keeps_done_flag():
    note = NoteCreate(
        kind="checklist",
        title="Basket",
        items=[{"text": "Milk"}, {"text": "  "}, {"text": "Eggs", "done": True}],
    )
    assert [(i.text, i.done) for i in note.items] == [("Milk", False), ("Eggs", True)]


def test_checklist_needs_at_least_one_item():
    with pytest.raises(ValidationError, match="Add at least one item"):
        NoteCreate(kind="checklist", title="Empty", items=[])


def test_checklist_body_optional():
    note = NoteCreate(kind="checklist", title="x", items=[{"text": "Milk"}])
    assert note.body_md == ""


def test_plain_note_forces_items_empty():
    note = NoteCreate(
        kind="note", title="x", body_md="hi", items=[{"text": "leftover"}]
    )
    assert note.items == []


def test_plain_note_needs_a_body():
    with pytest.raises(ValidationError, match="Write something first"):
        NoteCreate(kind="note", title="x", body_md="")


def test_journal_still_needs_a_date():
    with pytest.raises(ValidationError, match="Journal entries need a date"):
        NoteCreate(kind="journal", title="x", body_md="today was fine")


# --- Persistence (JSONB round-trip) --------------------------------------


async def test_checklist_and_folder_persist(db):
    user = User(username="carol", email="carol@example.com", hashed_password="x")
    db.add(user)
    await db.flush()

    payload = NoteCreate(
        kind="checklist",
        title="Weekly basket",
        folder="Shopping",
        items=[{"text": "Milk", "done": True}, {"text": "Eggs"}],
    )
    note = Note(user_id=user.id, **payload.model_dump())
    db.add(note)
    await db.commit()

    reloaded = await db.get(Note, note.id)
    assert reloaded.folder == "shopping"
    assert reloaded.items == [
        {"text": "Milk", "done": True},
        {"text": "Eggs", "done": False},
    ]
