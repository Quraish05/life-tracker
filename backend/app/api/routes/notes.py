from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select

from app.api.deps import INVALID_TOKEN, CurrentUser, DbSession
from app.api.responses import error_response
from app.models.note import Note
from app.schemas.note import NoteBase, NoteCreate, NoteRead, NoteUpdate

# Fields that make up a note's editable body (used to merge partial updates).
_NOTE_FIELDS = ("kind", "title", "body_md", "entry_date", "tags", "mood", "pinned")

router = APIRouter(prefix="/notes", tags=["notes"])

NOTE_NOT_FOUND = "Note not found."

# Every note endpoint requires a valid Bearer token.
_UNAUTHORIZED = {
    status.HTTP_401_UNAUTHORIZED: error_response(
        "Missing or invalid token", INVALID_TOKEN
    ),
}
_NOT_FOUND = {
    status.HTTP_404_NOT_FOUND: error_response("No such note for this user", NOTE_NOT_FOUND),
}


async def _get_owned_note(note_id: int, user: CurrentUser, db: DbSession) -> Note:
    """Fetch a note owned by the current user, or raise 404."""
    note = await db.get(Note, note_id)
    if note is None or note.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOTE_NOT_FOUND)
    return note


@router.get(
    "",
    response_model=list[NoteRead],
    summary="List the current user's notes",
    responses={**_UNAUTHORIZED},
)
async def list_notes(current_user: CurrentUser, db: DbSession) -> list[Note]:
    """Return all of the user's notes, pinned first then most-recently updated."""
    result = await db.scalars(
        select(Note)
        .where(Note.user_id == current_user.id)
        .order_by(Note.pinned.desc(), Note.updated_at.desc())
    )
    return list(result)


@router.post(
    "",
    response_model=NoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a note",
    responses={**_UNAUTHORIZED},
)
async def create_note(payload: NoteCreate, current_user: CurrentUser, db: DbSession) -> Note:
    """Create a new note or journal entry for the current user."""
    note = Note(user_id=current_user.id, **payload.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get(
    "/{note_id}",
    response_model=NoteRead,
    summary="Get a single note",
    responses={**_UNAUTHORIZED, **_NOT_FOUND},
)
async def get_note(note_id: int, current_user: CurrentUser, db: DbSession) -> Note:
    """Return a single note owned by the current user."""
    return await _get_owned_note(note_id, current_user, db)


@router.patch(
    "/{note_id}",
    response_model=NoteRead,
    summary="Update a note (partial)",
    responses={**_UNAUTHORIZED, **_NOT_FOUND},
)
async def update_note(
    note_id: int, payload: NoteUpdate, current_user: CurrentUser, db: DbSession
) -> Note:
    """Apply a partial update to a note.

    Only the fields present in the request change; this also covers pinning —
    send just ``{"pinned": true}`` / ``{"pinned": false}``. The patch is merged
    onto the current values and re-validated so invariants (journal-needs-a-date,
    notes-carry-no-date/mood) and tag normalization always hold; SQLAlchemy then
    writes only the columns that actually changed.
    """
    note = await _get_owned_note(note_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return note

    merged = {field: getattr(note, field) for field in _NOTE_FIELDS} | updates
    try:
        validated = NoteBase.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors()[0].get("msg", "Invalid note update"),
        ) from exc

    for field in _NOTE_FIELDS:
        setattr(note, field, getattr(validated, field))

    await db.commit()
    await db.refresh(note)
    return note


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a note",
    responses={**_UNAUTHORIZED, **_NOT_FOUND},
)
async def delete_note(note_id: int, current_user: CurrentUser, db: DbSession) -> None:
    """Permanently delete a note owned by the current user."""
    note = await _get_owned_note(note_id, current_user, db)
    await db.delete(note)
    await db.commit()
