from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import func, select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.api.responses import not_found_response
from app.models.note import Note
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderBase, ReminderCreate, ReminderRead, ReminderUpdate

# Fields that make up a reminder's editable body (used to merge partial updates).
_REMINDER_FIELDS = ("title", "body", "remind_at", "target_type", "target_id")

router = APIRouter(prefix="/reminders", tags=["reminders"])

REMINDER_NOT_FOUND = "Reminder not found."
TARGET_NOT_FOUND = "The reminder's target does not exist or isn't yours."

_NOT_FOUND = not_found_response("No such reminder for this user", REMINDER_NOT_FOUND)


async def _get_owned_reminder(reminder_id: int, user: CurrentUser, db: DbSession) -> Reminder:
    """Fetch a reminder owned by the current user, or raise 404."""
    reminder = await db.get(Reminder, reminder_id)
    if reminder is None or reminder.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=REMINDER_NOT_FOUND)
    return reminder


async def _validate_target(
    target_type: str | None, target_id: int | None, user: CurrentUser, db: DbSession
) -> None:
    """Ensure a soft-referenced target exists and belongs to the caller.

    Standalone reminders (no target) always pass. Today only notes are
    attachable; extend this as workouts/meals become targets.
    """
    if target_type is None:
        return
    if target_type == "note":
        note = await db.get(Note, target_id)
        if note is None or note.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TARGET_NOT_FOUND)


@router.get(
    "",
    response_model=list[ReminderRead],
    summary="List the current user's reminders",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def list_reminders(current_user: CurrentUser, db: DbSession) -> list[Reminder]:
    """Return all of the user's reminders, soonest first."""
    result = await db.scalars(
        select(Reminder)
        .where(Reminder.user_id == current_user.id)
        .order_by(Reminder.remind_at.asc())
    )
    return list(result)


@router.get(
    "/due",
    response_model=list[ReminderRead],
    summary="List reminders that are due and not yet delivered",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def list_due_reminders(current_user: CurrentUser, db: DbSession) -> list[Reminder]:
    """Return reminders whose time has arrived and that haven't been sent.

    This is what the frontend polls while a tab is open: ``remind_at`` is in
    the past (compared against the database clock) and ``sent_at`` is still
    NULL. The client shows each one, then calls ``/ack`` so it isn't repeated.
    """
    result = await db.scalars(
        select(Reminder)
        .where(
            Reminder.user_id == current_user.id,
            Reminder.sent_at.is_(None),
            Reminder.remind_at <= func.now(),
        )
        .order_by(Reminder.remind_at.asc())
    )
    return list(result)


@router.post(
    "",
    response_model=ReminderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a reminder",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def create_reminder(
    payload: ReminderCreate, current_user: CurrentUser, db: DbSession
) -> Reminder:
    """Create a reminder for the current user, standalone or attached."""
    await _validate_target(payload.target_type, payload.target_id, current_user, db)
    reminder = Reminder(user_id=current_user.id, **payload.model_dump())
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get(
    "/{reminder_id}",
    response_model=ReminderRead,
    summary="Get a single reminder",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def get_reminder(reminder_id: int, current_user: CurrentUser, db: DbSession) -> Reminder:
    """Return a single reminder owned by the current user."""
    return await _get_owned_reminder(reminder_id, current_user, db)


@router.patch(
    "/{reminder_id}",
    response_model=ReminderRead,
    summary="Update a reminder (partial)",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> Reminder:
    """Apply a partial update to a reminder.

    Only the fields present in the request change. The patch is merged onto
    the current values and re-validated through ``ReminderBase`` so invariants
    (timezone-aware time, target set as a pair) always hold; if the merged
    result names a target, we re-check its ownership.
    """
    reminder = await _get_owned_reminder(reminder_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return reminder

    merged = {field: getattr(reminder, field) for field in _REMINDER_FIELDS} | updates
    try:
        validated = ReminderBase.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors()[0].get("msg", "Invalid reminder update"),
        ) from exc

    await _validate_target(validated.target_type, validated.target_id, current_user, db)

    for field in _REMINDER_FIELDS:
        setattr(reminder, field, getattr(validated, field))

    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.post(
    "/{reminder_id}/ack",
    response_model=ReminderRead,
    summary="Acknowledge delivery of a reminder",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def acknowledge_reminder(
    reminder_id: int, current_user: CurrentUser, db: DbSession
) -> Reminder:
    """Mark a reminder as delivered so it stops showing up in ``/due``.

    Called by the client right after it shows the notification. Idempotent:
    acking an already-sent reminder leaves its original ``sent_at`` intact.
    """
    reminder = await _get_owned_reminder(reminder_id, current_user, db)
    if reminder.sent_at is None:
        reminder.sent_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(reminder)
    return reminder


@router.delete(
    "/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a reminder",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def delete_reminder(reminder_id: int, current_user: CurrentUser, db: DbSession) -> None:
    """Permanently delete a reminder owned by the current user."""
    reminder = await _get_owned_reminder(reminder_id, current_user, db)
    await db.delete(reminder)
    await db.commit()
