"""Request/response schemas for reminders.

A reminder is a time-based nudge. It can stand alone or point at another
record via a soft reference (`target_type` + `target_id`) — see
`app/models/reminder.py`. These schemas mirror the notes schema style so the
two features feel consistent.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# The only kind of record a reminder can attach to today. Widen this
# (e.g. "workout", "meal") as those tables are added.
TargetType = Literal["note"]


class ReminderBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=500)
    remind_at: datetime
    target_type: TargetType | None = None
    target_id: int | None = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        return value.strip()

    @field_validator("body")
    @classmethod
    def _strip_body(cls, value: str | None) -> str | None:
        cleaned = value.strip() if value else ""
        return cleaned or None

    @field_validator("remind_at")
    @classmethod
    def _require_tz(cls, value: datetime) -> datetime:
        """Reject naive datetimes so 'when' is never ambiguous."""
        if value.tzinfo is None:
            raise ValueError("remind_at must include a timezone offset")
        return value

    @model_validator(mode="after")
    def _target_both_or_neither(self) -> "ReminderBase":
        """A target is all-or-nothing: type and id travel together."""
        if (self.target_type is None) != (self.target_id is None):
            raise ValueError("target_type and target_id must be set together")
        return self


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    """Partial update (PATCH semantics).

    Every field is optional: omitted fields keep their current value. The
    route merges the patch onto the current values and re-validates through
    ``ReminderBase`` so the target-pairing and timezone rules always hold.
    Clearing a target back to standalone is done by sending
    ``target_type`` and ``target_id`` as explicit ``null``.
    """

    title: str | None = Field(default=None, min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=500)
    remind_at: datetime | None = None
    target_type: TargetType | None = None
    target_id: int | None = None


class ReminderRead(ReminderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime
