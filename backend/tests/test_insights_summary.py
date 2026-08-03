"""Tests for saving day summaries — the note-first, upsert-per-day behavior.

The AI generation is covered by the shared structured-output plumbing; here we
test the persistence contract that changed: a hand-typed note-only summary is
valid (structured fields nullable), and re-saving a day replaces the row.
"""

from datetime import date

from sqlalchemy import func, select

from app.api.routes.insights import list_summaries, save_summary
from app.models.daily_summary import DailySummaryRecord
from app.models.user import User
from app.schemas.health_ai import DailySummarySave


async def _make_user(db, username: str = "alice") -> User:
    user = User(username=username, email=f"{username}@example.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def test_note_only_summary_saves_without_structured(db):
    user = await _make_user(db)
    saved = await save_summary(
        DailySummarySave(summary_date=date(2026, 8, 3), note="Felt good, ate light."),
        user,
        db,
    )

    assert saved.note == "Felt good, ate light."
    assert saved.assessment is None
    assert saved.calories_in is None
    assert saved.model is None


async def test_resaving_a_day_upserts(db):
    user = await _make_user(db)
    day = date(2026, 8, 3)
    await save_summary(DailySummarySave(summary_date=day, note="first"), user, db)
    await save_summary(DailySummarySave(summary_date=day, note="second"), user, db)

    count = await db.scalar(
        select(func.count())
        .select_from(DailySummaryRecord)
        .where(DailySummaryRecord.user_id == user.id)
    )
    assert count == 1  # one row per user/day, replaced in place

    rows = await list_summaries(day, day, user, db)
    assert rows[0].note == "second"


async def test_ai_snapshot_persists_numbers_alongside_note(db):
    user = await _make_user(db)
    saved = await save_summary(
        DailySummarySave(
            summary_date=date(2026, 8, 3),
            note="You had a balanced day.",
            calories_in=1800,
            calories_out=400,
            target_calories=2000,
            assessment="on_track",
            headline="Solid day",
            tip="Keep it up",
            model="claude-haiku-4-5",
        ),
        user,
        db,
    )

    assert saved.note == "You had a balanced day."
    assert saved.calories_in == 1800
    assert saved.assessment == "on_track"
    assert saved.model == "claude-haiku-4-5"
