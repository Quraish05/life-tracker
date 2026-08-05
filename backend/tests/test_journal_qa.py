"""answer_question + the /journal/ask route — grounded answers and quota charging.

Embedder and generation are both faked, so the tests assert the *wiring*: no-data
paths make no model call (and cost no credit), a real answer resolves citations
from used_note_ids and charges exactly one credit.
"""

from datetime import date

from app.api.routes.journal import ask_journal
from app.models.note import Note
from app.models.note_chunk import NoteChunk
from app.models.user import User
from app.schemas.journal_qa import AskJournalAnswer, AskJournalRequest
from app.services import journal_qa


def _unit(i: int, dim: int = 384) -> list[float]:
    v = [0.0] * dim
    v[i] = 1.0
    return v


async def _user(db, name="qa") -> User:
    user = User(username=name, email=f"{name}@x.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def _journal_with_chunk(db, user, title="Sleep", body="slept well") -> Note:
    note = Note(
        user_id=user.id, kind="journal", title=title, body_md=body,
        entry_date=date(2026, 8, 1),
    )
    db.add(note)
    await db.flush()
    db.add(
        NoteChunk(
            note_id=note.id, user_id=user.id, chunk_index=0,
            chunk_text=body, embedding=_unit(0),
        )
    )
    await db.flush()
    return note


def _fake_query(monkeypatch):
    async def q(text):
        return _unit(0)

    monkeypatch.setattr(journal_qa, "embed_query", q)


def _fake_generation(monkeypatch, *, answer, used_ids):
    async def gen(**kwargs):
        return AskJournalAnswer(answer=answer, used_note_ids=used_ids), "fake-model"

    monkeypatch.setattr(journal_qa, "generate_structured", gen)


async def test_answer_no_entries_is_free(db, monkeypatch):
    user = await _user(db, "noentries")
    result = await journal_qa.answer_question(db, user, "how have I been?")
    assert result.used_model is False
    assert result.citations == []
    assert "journal" in result.answer.lower()


async def test_answer_grounded_resolves_citations(db, monkeypatch):
    user = await _user(db, "grounded")
    note = await _journal_with_chunk(db, user)
    _fake_query(monkeypatch)
    _fake_generation(monkeypatch, answer="You slept well.", used_ids=[note.id])

    result = await journal_qa.answer_question(db, user, "how did I sleep?")
    assert result.used_model is True
    assert result.model == "fake-model"
    assert result.answer == "You slept well."
    assert [c.note_id for c in result.citations] == [note.id]
    assert result.citations[0].title == "Sleep"


async def test_ask_route_charges_one_credit_on_answer(db, monkeypatch):
    user = await _user(db, "charge")
    note = await _journal_with_chunk(db, user)
    _fake_query(monkeypatch)
    _fake_generation(monkeypatch, answer="Restful.", used_ids=[note.id])

    before = user.ai_usage_count
    resp = await ask_journal(AskJournalRequest(question="my sleep?"), user, db)
    assert resp.answer == "Restful."
    assert user.ai_usage_count == before + 1  # exactly one credit


async def test_ask_route_no_charge_on_no_data(db, monkeypatch):
    user = await _user(db, "nocharge")  # no chunks → no-data path
    before = user.ai_usage_count
    resp = await ask_journal(AskJournalRequest(question="anything?"), user, db)
    assert resp.citations == []
    assert user.ai_usage_count == before  # unchanged — a free no-data answer
