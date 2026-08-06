"""Saved journal insights (Patterns) — CRUD + user scoping.

Pure persistence: saving an answer makes no model call, so these tests need no AI
fakes. They assert the roundtrip (save → list), the citations snapshot, the vote
update, delete, and that one user can never touch another's insights (404).
"""

import pytest
from fastapi import HTTPException

from app.api.routes.journal import (
    delete_insight,
    list_insights,
    save_insight,
    vote_insight,
)
from app.models.user import User
from app.schemas.journal_insight import JournalInsightCreate, JournalInsightVote
from app.schemas.journal_qa import Citation


async def _user(db, name="insights") -> User:
    user = User(username=name, email=f"{name}@x.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


def _payload(**over) -> JournalInsightCreate:
    data = dict(
        question="How has my sleep been?",
        answer="Rough in early June, better by July.",
        citations=[
            Citation(
                note_id=1,
                entry_date="2026-06-03",
                title="Rough night",
                snippet="couldn't switch off",
            ),
            Citation(
                note_id=2,
                entry_date="2026-06-09",
                title="Woke at 3",
                snippet="never got back down",
            ),
        ],
        model="fake-model",
    )
    data.update(over)
    return JournalInsightCreate(**data)


async def test_save_then_list_roundtrip(db):
    user = await _user(db, "roundtrip")
    saved = await save_insight(_payload(), user, db)

    assert saved.id is not None
    assert saved.helpful is None  # unvoted on creation

    listed = await list_insights(user, db)
    assert [i.id for i in listed] == [saved.id]
    assert listed[0].answer == "Rough in early June, better by July."


async def test_citations_snapshot_is_preserved(db):
    user = await _user(db, "snapshot")
    saved = await save_insight(_payload(), user, db)

    [first] = [c for c in saved.citations if c["note_id"] == 1]
    assert first["title"] == "Rough night"
    assert first["entry_date"] == "2026-06-03"
    assert first["snippet"] == "couldn't switch off"


async def test_list_is_newest_first(db):
    user = await _user(db, "ordering")
    older = await save_insight(_payload(question="older one?"), user, db)
    newer = await save_insight(_payload(question="newer one?"), user, db)

    listed = await list_insights(user, db)
    # created_at desc — the later insert comes first (ties break on higher id).
    assert [i.id for i in listed] == [newer.id, older.id]


async def test_vote_sets_and_clears(db):
    user = await _user(db, "voter")
    saved = await save_insight(_payload(), user, db)

    voted = await vote_insight(saved.id, JournalInsightVote(helpful=True), user, db)
    assert voted.helpful is True

    off_base = await vote_insight(saved.id, JournalInsightVote(helpful=False), user, db)
    assert off_base.helpful is False

    cleared = await vote_insight(saved.id, JournalInsightVote(helpful=None), user, db)
    assert cleared.helpful is None


async def test_delete_removes_it(db):
    user = await _user(db, "deleter")
    saved = await save_insight(_payload(), user, db)

    await delete_insight(saved.id, user, db)
    assert await list_insights(user, db) == []


async def test_cannot_touch_another_users_insight(db):
    owner = await _user(db, "owner")
    other = await _user(db, "intruder")
    saved = await save_insight(_payload(), owner, db)

    # Not in the other user's list…
    assert await list_insights(other, db) == []

    # …and vote/delete on it 404 for the intruder.
    with pytest.raises(HTTPException) as vote_exc:
        await vote_insight(saved.id, JournalInsightVote(helpful=True), other, db)
    assert vote_exc.value.status_code == 404

    with pytest.raises(HTTPException) as del_exc:
        await delete_insight(saved.id, other, db)
    assert del_exc.value.status_code == 404


async def test_vote_missing_insight_404s(db):
    user = await _user(db, "missing")
    with pytest.raises(HTTPException) as exc:
        await vote_insight(99999, JournalInsightVote(helpful=True), user, db)
    assert exc.value.status_code == 404
