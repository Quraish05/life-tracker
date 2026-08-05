"""Hybrid journal retrieval — RRF + MMR (pure) and the dense+lexical fusion (DB).

The pure fusion/diversity helpers are unit-tested directly; the DB test crafts
orthogonal unit-vector embeddings and a faked query vector so the dense arm is
deterministic, and relies on real Postgres FTS for the lexical arm.
"""

from datetime import date

from app.models.note import Note
from app.models.note_chunk import NoteChunk
from app.models.user import User
from app.services import journal_qa
from app.services.journal_qa import Retrieved, _mmr_select, rrf_fuse


def _unit(i: int, dim: int = 384) -> list[float]:
    v = [0.0] * dim
    v[i] = 1.0
    return v


def test_rrf_fuse_ranks_both_arms_hit_highest():
    dense = [10, 20, 30]  # note ids, best first
    lexical = [40, 20]  # 20 appears in both arms
    scores = rrf_fuse(dense, lexical)

    ranked = sorted(scores, key=lambda nid: scores[nid], reverse=True)
    assert ranked[0] == 20  # found by both arms → top
    assert 10 in scores and 40 in scores  # single-arm ids still contribute
    # equal rank in their (only) arm → equal score
    assert scores[10] == scores[40]


def test_mmr_prefers_diversity_over_near_duplicate():
    dup1 = Retrieved(1, "", None, "", _unit(0), similarity=0.90)
    dup2 = Retrieved(2, "", None, "", _unit(0), similarity=0.88)  # ~identical to dup1
    other = Retrieved(3, "", None, "", _unit(1), similarity=0.60)  # distinct direction

    picked = [r.note_id for r in _mmr_select([dup1, dup2, other], k=2)]
    assert picked[0] == 1  # highest relevance first
    assert 3 in picked  # diversity beats the near-duplicate
    assert 2 not in picked


async def _seed(db, name="ret"):
    user = User(username=name, email=f"{name}@x.com", hashed_password="x")
    db.add(user)
    await db.flush()
    notes = {}
    for key, title, body, vec in [
        ("sleep", "Sleep log", "sleep was restful", _unit(0)),
        ("work", "Work day", "work was stressful", _unit(1)),
        ("food", "Dinner", "cooked pasta tonight", _unit(2)),
    ]:
        note = Note(
            user_id=user.id, kind="journal", title=title, body_md=body,
            entry_date=date(2026, 8, 1),
        )
        db.add(note)
        await db.flush()
        db.add(
            NoteChunk(
                note_id=note.id, user_id=user.id, chunk_index=0,
                chunk_text=body, embedding=vec,
            )
        )
        notes[key] = note
    await db.flush()
    return user, notes


async def test_retrieve_fuses_dense_and_lexical(db, monkeypatch):
    user, notes = await _seed(db)

    # Faked query vector aligned with the "sleep" chunk → dense arm favours it.
    async def fake_query(text):
        return _unit(0)

    monkeypatch.setattr(journal_qa, "embed_query", fake_query)

    # The question keyword "work" only matches the work entry lexically; the dense
    # arm points at "sleep". A correct hybrid returns BOTH.
    results = await journal_qa.retrieve(db, user, "work")
    ids = {r.note_id for r in results}

    assert notes["sleep"].id in ids  # dense hit (query ≈ sleep vector)
    assert notes["work"].id in ids  # lexical hit ("work" keyword)


async def test_retrieve_empty_corpus_returns_nothing(db, monkeypatch):
    user = User(username="empty", email="empty@x.com", hashed_password="x")
    db.add(user)
    await db.flush()

    async def fake_query(text):
        return _unit(0)

    monkeypatch.setattr(journal_qa, "embed_query", fake_query)
    assert await journal_qa.retrieve(db, user, "anything") == []
