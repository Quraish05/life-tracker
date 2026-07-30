"""Integration tests for note full-text search (app/services/note_search.py).

These run against a real Postgres (the `db` fixture in conftest.py) because FTS —
`to_tsvector`, `websearch_to_tsquery`, ranking, `ts_headline` — is Postgres-only
and can't be faked. Each test's writes are rolled back afterwards.
"""

from app.models.note import Note
from app.models.user import User
from app.services.note_search import search_notes


async def _make_user(db, username: str = "alice") -> User:
    user = User(username=username, email=f"{username}@example.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def _add_note(db, user: User, title: str, body: str) -> Note:
    note = Note(user_id=user.id, kind="note", title=title, body_md=body)
    db.add(note)
    await db.flush()
    return note


async def test_finds_note_by_body_keyword(db):
    user = await _make_user(db)
    grocery = await _add_note(db, user, "Grocery run", "bought spinach and paneer")
    await _add_note(db, user, "Workout", "did squats and lunges")

    rows = await search_notes(db, user.id, "spinach")

    assert [row[0].id for row in rows] == [grocery.id]


async def test_title_outranks_body(db):
    user = await _make_user(db)
    # Same term in a title (weight A) vs a body (weight B) — title should win.
    body_hit = await _add_note(db, user, "Dinner", "cooked a spinach curry")
    title_hit = await _add_note(db, user, "Spinach recipe", "a simple green dish")

    rows = await search_notes(db, user.id, "spinach")

    assert {row[0].id for row in rows} == {title_hit.id, body_hit.id}
    assert rows[0][0].id == title_hit.id  # ranked first


async def test_scoped_to_the_given_user(db):
    alice = await _make_user(db, "alice")
    bob = await _make_user(db, "bob")
    mine = await _add_note(db, alice, "Notes", "my meditation practice")
    await _add_note(db, bob, "Notes", "his meditation retreat")

    rows = await search_notes(db, alice.id, "meditation")

    assert [row[0].id for row in rows] == [mine.id]


async def test_snippet_highlights_the_match(db):
    user = await _make_user(db)
    await _add_note(db, user, "Diary", "I felt exhausted after the long run today")

    rows = await search_notes(db, user.id, "exhausted")

    assert "<mark>" in rows[0].snippet


async def test_websearch_exclude_syntax(db):
    user = await _make_user(db)
    morning = await _add_note(db, user, "Coffee", "a quiet coffee in the morning")
    await _add_note(db, user, "Coffee", "a strong coffee in the evening")

    rows = await search_notes(db, user.id, "coffee -evening")

    assert [row[0].id for row in rows] == [morning.id]


async def test_no_match_returns_empty(db):
    user = await _make_user(db)
    await _add_note(db, user, "Hello", "nothing relevant here")

    assert await search_notes(db, user.id, "zzzznomatch") == []


async def test_blank_query_short_circuits(db):
    user = await _make_user(db)
    await _add_note(db, user, "Hello", "some content")

    assert await search_notes(db, user.id, "   ") == []
