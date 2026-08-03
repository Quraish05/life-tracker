# Ch 4. Notes & journal — one table, three faces

> One `notes` table backs three things: a **journal entry** (pinned to a day,
> with a mood), a free-form **note**, and a **checklist**. They share a row shape
> and diverge by `kind`. This chapter traces how a note is stored, categorised
> (folders vs. tags), and rendered across two pages.
>
> _Last updated: 2026-08-03._

---

## Mental model

Everything the user "keeps" or "reflects on" is a row in `notes`, discriminated by
`kind`:

| kind        | lives on   | carries                        | doesn't carry        |
|-------------|-----------|--------------------------------|----------------------|
| `journal`   | `/journal` | `entry_date`, `mood`, `body_md`| `folder`, `items`    |
| `note`      | `/notes`   | `body_md`, optional `folder`   | `entry_date`, `mood`, `items` |
| `checklist` | `/notes`   | `items[]`, optional `folder`   | `entry_date`, `mood` (body optional) |

Two orthogonal ideas categorise a note:

- **Folder** — the *one* bucket a note lives in (Eating out / Shopping / Health /
  Recipes). Single-select, colour-coded, used for the filter chips.
- **Tags** — *many* free-text slugs per note. Open-vocabulary, feed search and AI
  tag-suggestion. Kept deliberately separate from folders (see
  [DECISIONS](../DECISIONS.md), 2026-08-03).

> Why both? A folder is a stable categorical signal (good to classify into and
> aggregate over); tags stay flexible and never need a schema change. Collapsing
> them would lose one of those properties.

---

## Data model

One table, `notes` (`backend/app/models/note.py`):

```
id, user_id, kind (journal|note|checklist),
title, body_md,
entry_date (journal only), mood (journal only),
tags        ARRAY(String(24))   -- many, normalized slugs
folder      String(40) | null   -- one slug, e.g. "eating-out"
items       JSONB, default '[]'  -- [{text, done}] for checklists
pinned, created_at, updated_at,
search_vector TSVECTOR (generated)  -- title 'A' + body 'B', see Ch 9
```

- **`folder`** stores only a slug. The human label and colour live on the
  frontend in `NOTE_FOLDERS` (`frontend/src/constants/notes.ts`) — so we can
  restyle without a migration. There is no `folders` table (parked until
  user-defined folders are wanted).
- **`items`** is JSONB, not a related table — a checklist's rows have no identity
  or query needs of their own, so a document column is the right weight. Not
  full-text indexed (only `title`/`body_md` are).

Both were added as additive, nullable/defaulted columns
(`e5c2a7d90f31_add_note_folder`, `f1a3b6d24c80_add_note_checklist_items`).

### Validation mirrors, client ↔ server

The Zod schema (`frontend/src/lib/validations/note.ts`) and the Pydantic schema
(`backend/app/schemas/note.py`) are kept in lockstep. The per-kind rules:

- **journal** → needs `entry_date` and a non-empty `body_md`; `items` forced `[]`.
- **note** → needs `body_md`; `entry_date`/`mood`/`items` cleared.
- **checklist** → needs ≥1 item (blank-text rows dropped first); `body_md`
  optional; `entry_date`/`mood` cleared.

`folder` is slugified the same way tags are (`"Eating Out"` → `"eating-out"`,
blank → `null`); `normalize_folder` / `normalizeFolder` mirror each other.

---

## The flow, both directions

### Read — browsing `/notes`

1. `useNotes()` fetches every note; the page keeps `kind !== "journal"` (notes +
   checklists). `/journal` keeps `kind === "journal"`.
2. Folder **filter chips** are built from a live count of `folder` values (only
   folders in use appear), plus an "All" chip. `NOTE_FOLDERS` supplies each
   chip/dot/strip colour as a *static* class string (so Tailwind v4's scanner
   keeps them — never compose colour classes from a variable).
3. `NoteCard` branches on kind: a journal card (unchanged) vs. the redesigned note
   card. A checklist card renders its rows with tick-boxes; a text note renders a
   body snippet.

### Write — creating/editing

1. `NoteEditor` is one modal for all three kinds. Each page passes `fixedKind`
   (`"note"` / `"journal"`), which hides the kind selector; `/notes` also passes
   `presetFolder` (the active filter) so a new note lands in the folder you're
   looking at.
2. For notes, a **Note / Checklist** toggle switches `kind` between `note` and
   `checklist`; switching to checklist seeds one empty row. Checklist mode shows
   the item editor (tick / edit / remove / + Item); note mode shows the markdown
   editor.
3. On submit, `useCreateNote` / `useUpdateNote` send the full/partial `NoteInput`.
   Ticking a checklist item **from the card** PATCHes just `{ items }`.

---

## The tricky part: PATCH-merge + JSONB serialisation

Updates are partial (PATCH). The route merges the patch onto the note's current
values, then **re-validates the merged result through `NoteBase`** so the
per-kind invariants and normalisation always hold — you can't PATCH a checklist
into an invalid state.

One sharp edge: after validation, `items` are `ChecklistItem` *Pydantic objects*,
which the JSONB column can't serialise. So the route writes columns from
`validated.model_dump()` (plain dicts), not from the model attributes:

```python
validated_data = validated.model_dump()
for field in _NOTE_FIELDS:
    setattr(note, field, validated_data[field])
```

`create` already used `**payload.model_dump()`, so it was fine; the update path is
where this bites.

---

## How to run & test

- Migrations: `alembic upgrade head` (adds `folder`, then `items`).
- Backend tests: `pytest tests/test_notes_folder_checklist.py` — folder slugging,
  the three kinds' rules, blank-row dropping, and a JSONB round-trip. FTS over
  notes is covered separately in `test_note_search.py` (Ch 9).
- Frontend: `npx tsc --noEmit && npx eslint src`.

---

## Gotchas

- **Folder colours must be literal class strings.** `NOTE_FOLDERS` writes out
  `bg-peach`, `bg-mint`, … in full. Building `bg-${tint}` at runtime would be
  invisible to Tailwind v4's source scan and render unstyled.
- **`kind` has three values now.** Any `kind === "note"` check that meant "not a
  journal" must become `kind !== "journal"` (this caught the `/notes` list +
  search filters).
- **Search doesn't index checklist items.** Only `title`/`body_md` feed the
  `tsvector`; a checklist matches by title. Fine for now; revisit if needed.
- **Journal redesign is deferred.** `/journal` reuses the old card/editor. A
  journal entry's detail view still opens at `/notes/[id]` (shared reader).

---

## Future enhancements

- A per-user `folders` table with in-app create/rename/recolor (currently a fixed
  frontend list).
- Redesign the Journal page to match the Notes visual language.
- Index checklist item text into the search vector.
- Optimistic UI for card-level item ticking (currently invalidate-and-refetch).
