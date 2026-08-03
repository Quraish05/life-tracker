"""Tools the chat assistant can call, wired to the app's own data layer.

Each tool is a small, typed action over the user's records — logging a meal or
exercise, creating a reminder, or reading back a day. The model decides *when*
to call them (CCAF Domain 4.3 tool use); this module owns *what they do*, always
scoped to the current user. Writes auto-execute (the user sees the result echoed
in the UI) — the actions are low-stakes and reversible.

Each executor returns an :class:`ToolOutcome`: ``result`` is the text handed back
to the model (so it can confirm or recover), ``summary`` is the one-line label
the UI renders (e.g. "Logged Morning walk to today").
"""

from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise_log import ExerciseLog
from app.models.food import FoodItem
from app.models.meal_log import MealLog
from app.models.reminder import Reminder
from app.models.user import User

_SLOTS = ("breakfast", "lunch", "dinner", "snack")

# The tool schemas advertised to the model. Kept deliberately small and typed so
# the model fills exact shapes; dates are optional and default to "today".
TOOLS: list[dict] = [
    {
        "name": "log_meal",
        "description": (
            "Log a food the user ate into a meal slot on a day. If the named food "
            "isn't in their library yet, it's created automatically. Use when the "
            "user says they ate/had something."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "food_name": {
                    "type": "string",
                    "description": "What they ate, e.g. 'Greek yogurt bowl'.",
                },
                "slot": {"type": "string", "enum": list(_SLOTS)},
                "date": {"type": "string", "description": "Day as YYYY-MM-DD. Omit for today."},
                "note": {
                    "type": "string",
                    "description": "Optional portion/note, e.g. '1 bowl'.",
                },
            },
            "required": ["food_name", "slot"],
        },
    },
    {
        "name": "log_exercise",
        "description": (
            "Log an exercise/workout the user did on a day. Use when they say "
            "they worked out, walked, ran, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "The activity, e.g. 'Morning walk'."},
                "date": {"type": "string", "description": "Day as YYYY-MM-DD. Omit for today."},
                "note": {
                    "type": "string",
                    "description": "Optional detail, e.g. '42 min' or '3×12 @ 20kg'.",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "create_reminder",
        "description": (
            "Create a time-based reminder. Resolve relative times ('tomorrow 6pm') "
            "against the current date/time given in the system prompt and pass an "
            "ISO-8601 datetime WITH the user's UTC offset."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "What to be reminded about."},
                "remind_at": {
                    "type": "string",
                    "description": "ISO-8601 datetime with offset, e.g. 2026-08-02T18:00:00+05:30.",
                },
                "body": {"type": "string", "description": "Optional extra detail."},
            },
            "required": ["title", "remind_at"],
        },
    },
    {
        "name": "query_day",
        "description": (
            "Read back what the user logged on a day: their meals (by slot) and "
            "exercises. Use for 'what did I eat/do' questions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Day as YYYY-MM-DD. Omit for today."},
            },
        },
    },
]


@dataclass
class ToolOutcome:
    """A tool's result: ``result`` goes to the model, ``summary`` to the UI."""

    result: str
    summary: str
    ok: bool = True


def _resolve_date(raw: object, today: date) -> date:
    """Parse an optional YYYY-MM-DD, falling back to the user's local today."""
    if isinstance(raw, str) and raw.strip():
        return date.fromisoformat(raw.strip())
    return today


async def _find_or_create_food(db: AsyncSession, user: User, name: str) -> FoodItem:
    """Match a food by case-insensitive name, or create a standalone one."""
    existing = await db.scalar(
        select(FoodItem).where(
            FoodItem.user_id == user.id,
            func.lower(FoodItem.name) == name.lower(),
        )
    )
    if existing is not None:
        return existing
    food = FoodItem(user_id=user.id, name=name)
    db.add(food)
    await db.flush()
    return food


async def _log_meal(
    tool_input: dict, user: User, db: AsyncSession, tz: ZoneInfo, today: date
) -> ToolOutcome:
    name = str(tool_input.get("food_name", "")).strip()
    slot = str(tool_input.get("slot", "")).strip().lower()
    if not name:
        return ToolOutcome("Error: food_name is required.", "Couldn't log meal", ok=False)
    if slot not in _SLOTS:
        return ToolOutcome(f"Error: slot must be one of {_SLOTS}.", "Couldn't log meal", ok=False)
    day = _resolve_date(tool_input.get("date"), today)
    note = (str(tool_input.get("note", "")).strip() or None)

    food = await _find_or_create_food(db, user, name)
    meal = MealLog(
        user_id=user.id, log_date=day, slot=slot,
        food_id=food.id, food_name=food.name, note=note,
    )
    db.add(meal)
    await db.commit()
    when = "today" if day == today else day.isoformat()
    note_part = f" ({note})" if note else ""
    return ToolOutcome(
        f"Logged '{food.name}' to {slot} on {day.isoformat()}{note_part}.",
        f"Logged {food.name} · {slot} · {when}",
    )


async def _log_exercise(
    tool_input: dict, user: User, db: AsyncSession, tz: ZoneInfo, today: date
) -> ToolOutcome:
    name = str(tool_input.get("name", "")).strip()
    if not name:
        return ToolOutcome("Error: name is required.", "Couldn't log exercise", ok=False)
    day = _resolve_date(tool_input.get("date"), today)
    note = (str(tool_input.get("note", "")).strip() or None)

    exercise = ExerciseLog(user_id=user.id, log_date=day, name=name, note=note)
    db.add(exercise)
    await db.commit()
    when = "today" if day == today else day.isoformat()
    return ToolOutcome(
        f"Logged exercise '{name}' on {day.isoformat()}" + (f" ({note})." if note else "."),
        f"Logged {name} · {when}",
    )


async def _create_reminder(
    tool_input: dict, user: User, db: AsyncSession, tz: ZoneInfo, today: date
) -> ToolOutcome:
    title = str(tool_input.get("title", "")).strip()
    raw_when = str(tool_input.get("remind_at", "")).strip()
    if not title or not raw_when:
        return ToolOutcome(
            "Error: title and remind_at are required.", "Couldn't create reminder", ok=False
        )
    try:
        when = datetime.fromisoformat(raw_when)
    except ValueError:
        return ToolOutcome(
            "Error: remind_at must be ISO-8601, e.g. 2026-08-02T18:00:00+05:30.",
            "Couldn't create reminder", ok=False,
        )
    # The model should send an offset, but localize a naive value to the user's tz
    # rather than reject — the reminder column requires tz-awareness.
    if when.tzinfo is None:
        when = when.replace(tzinfo=tz)
    body = (str(tool_input.get("body", "")).strip() or None)

    reminder = Reminder(user_id=user.id, title=title, body=body, remind_at=when)
    db.add(reminder)
    await db.commit()
    local = when.astimezone(tz)
    pretty = local.strftime("%b %-d, %-I:%M %p")
    return ToolOutcome(
        f"Created reminder '{title}' for {when.isoformat()}.",
        f"Reminder set · {title} · {pretty}",
    )


async def _query_day(
    tool_input: dict, user: User, db: AsyncSession, tz: ZoneInfo, today: date
) -> ToolOutcome:
    day = _resolve_date(tool_input.get("date"), today)
    meals = list(await db.scalars(
        select(MealLog).where(MealLog.user_id == user.id, MealLog.log_date == day)
    ))
    exercises = list(await db.scalars(
        select(ExerciseLog).where(ExerciseLog.user_id == user.id, ExerciseLog.log_date == day)
    ))

    lines: list[str] = []
    if meals:
        by_slot: dict[str, list[str]] = {}
        for m in meals:
            label = m.food_name + (f" ({m.note})" if m.note else "")
            by_slot.setdefault(m.slot, []).append(label)
        for slot in _SLOTS:
            if slot in by_slot:
                lines.append(f"{slot.title()}: {', '.join(by_slot[slot])}")
    if exercises:
        lines.append("Exercise: " + ", ".join(
            e.name + (f" ({e.note})" if e.note else "") for e in exercises
        ))

    when = "today" if day == today else day.isoformat()
    if not lines:
        return ToolOutcome(f"Nothing logged on {day.isoformat()}.", f"Read {when} · nothing logged")
    return ToolOutcome(
        f"On {day.isoformat()}:\n" + "\n".join(lines),
        f"Read {when} · {len(meals)} meal(s), {len(exercises)} exercise(s)",
    )


_EXECUTORS = {
    "log_meal": _log_meal,
    "log_exercise": _log_exercise,
    "create_reminder": _create_reminder,
    "query_day": _query_day,
}


async def execute_tool(
    name: str, tool_input: dict, *, user: User, db: AsyncSession, tz: ZoneInfo, today: date
) -> ToolOutcome:
    """Dispatch a tool call to its executor, scoped to the current user.

    Never raises for a bad tool/input — returns a ``ToolOutcome`` with ``ok=False``
    and an error ``result`` so the model can recover and tell the user.
    """
    executor = _EXECUTORS.get(name)
    if executor is None:
        return ToolOutcome(f"Error: unknown tool '{name}'.", "Unknown action", ok=False)
    try:
        return await executor(tool_input, user, db, tz, today)
    except Exception as exc:  # noqa: BLE001 — surface any failure back to the model
        await db.rollback()
        return ToolOutcome(f"Error running {name}: {exc}", f"{name} failed", ok=False)
