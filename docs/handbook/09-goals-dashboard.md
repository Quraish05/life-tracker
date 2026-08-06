# Chapter 13 — Goals dashboard & the Goal Evaluator

**Last updated:** 2026-08-06 · **Status:** ✅ current with `feat/goals-dashboard`

**Why we did this.** The `/goal` page was a bare **edit form** for the single
weight-based `HealthGoal`. The redesign turns it into a **progress dashboard**:
where you are against the goal, today's meals/workouts measured against it, a
seven-day alignment strip — and, on demand, an AI **Goal Evaluator** that reads
the week and tells you what's helping, what's working against you, and one thing
to adjust.

**The one principle worth holding.** *Metrics are deterministic and free; only
the qualitative read costs a token.* Everything numeric on the page (today's
calorie/protein tally, the alignment bars, "Day X of N") is computed client-side
from data we already have. The **only** paid piece is the Goal Evaluator, and it
runs **only when you click** — one deliberate, quota-charged call per press. That
keeps a whole dashboard's worth of "progress" at $0 and spends AI where prose
actually adds something.

---

## 13.1 Mental model — honest about what's backed

The design sketched far more than the data model holds. We built the parts with
real backing and dropped the rest rather than fake them:

- **One goal, not many.** `health_goals` is one row per user (unique `user_id`) —
  no categories, no multi-goal grid, no milestones table. So the dashboard is a
  *focus* card for that single goal, not the design's "3 active, 4 on the side".
- **Progress is time-based, not weight-based.** We store `current_weight_kg` and
  `target_weight_kg` as a single overwritten snapshot — there's **no weigh-in
  history** — so we can't honestly draw a "1.6 kg down" curve. The progress bar
  tracks **elapsed time** ("Day X of N" from `created_at` + `timeframe_weeks`),
  with current → target shown alongside as "X kg to go", never as the bar.
- **Numbers come from the food join.** A `MealLog` carries no macros; calories and
  protein live on the referenced `FoodItem`. Tallies are a client-side
  `meal.food_id → FoodItem` lookup ([_lib.ts](../../frontend/src/components/goal/_lib.ts)),
  with zeros when a food's macros are still null.
- **Alignment reuses saved day summaries.** The seven-day strip reads
  `assessment` from `daily_summaries` ([Ch 10](05-ai-nutrition-estimation.md)) —
  a day only has a coloured bar if a summary was saved that day, so unsaved days
  stay faint. That's a documented gap, not invented data.

---

## 13.2 The data — nothing new persisted

This slice adds **no tables and no migration**. It composes existing data:

| Piece | Source |
| --- | --- |
| The goal | `GET /health-goal` → `useHealthGoal` |
| Today's tally | `useMeals(today,today)` + `useFoods()`, joined in `_lib.tallyMeals` |
| Sessions this week | `useExercises(last7,today)`, distinct `log_date` count |
| Alignment strip | `useSummaries(last7,today)` → `assessment` per day |
| Evaluator | new `POST /health-goal/evaluate?scope=today\|week` (not persisted) |

The evaluator's result is deliberately **not stored**: like the Log page's day
summary, it's shown after you run it and gone on reload. Persisting it would mean
a table and a stale-invalidation story for a value that's cheap to regenerate.

---

## 13.3 The Goal Evaluator — a near-copy of `summarize_day`

The evaluator ([goal_evaluator.py](../../backend/app/services/goal_evaluator.py))
mirrors [daily_summary.py](../../backend/app/services/daily_summary.py) beat for
beat: a strict `_SCHEMA` dict, a `_SYSTEM_PROMPT`, a `_build_user_message`, and
the shared `generate_structured` engine. Two things are specific to it:

1. **It resolves a window from the scope.** `today` → just today; `week` → the
   last 7 days inclusive (`_range_for`). The route passes `today=date.today()`;
   the service takes `today` as a parameter so tests are deterministic.
2. **It feeds the model deterministic tallies.** Before the call, it computes each
   day's calorie/protein totals from the food join and puts *those numbers* in the
   prompt alongside the item list — so the model reasons over real figures, not
   guesses from names.

```python
async def evaluate_goal(db, user, scope, *, today) -> EvalResult:
    goal = ...                                   # no goal?      → free no-data
    start, end = _range_for(scope, today)
    meals, exercises = await _fetch(db, user.id, start, end)
    if not meals and not exercises:              # nothing logged → free no-data
        return _no_data(...)
    food_by_id = { ... }                         # MealLog.food_id → FoodItem
    return EvalResult(*await generate_structured(...), used_model=True)
```

**Charge only when the model runs.** `EvalResult.used_model` is `False` on both
no-data short-circuits (no goal, or nothing logged), so the route gates
`record_ai_usage` on it — exactly the pattern from
[journal.py](../../backend/app/api/routes/journal.py):

```python
enforce_ai_quota(current_user)
with ai_errors_as_http("Could not evaluate your goal right now. Please try again."):
    result = await evaluate_goal(db, current_user, scope, today=date.today())
if result.used_model:
    await record_ai_usage(current_user, db)
```

The output schema ([goal_eval.py](../../backend/app/schemas/goal_eval.py)) is
`{alignment_score, verdict, readout, helping[], hurting[], adjustment}` — the
score drives the ring, `helping`/`hurting` are `GoalSignal {emoji, text, value}`
rows, and `adjustment` is one suggestion.

---

## 13.4 The frontend — a dashboard + a rail

[goal/page.tsx](../../frontend/src/app/(app)/goal/page.tsx) is a two-column layout
(stacks on mobile). Components live under
[components/goal/](../../frontend/src/components/goal/):

- **`FocusGoalCard`** — the goal, time-based progress bar, and a "today so far"
  tally row (all from `_lib`).
- **`TodayAgainstGoal`** — today's meals (kcal · protein via the food join) and
  workouts, with light, defensible tags (a soft "Low protein" only when a meal is
  clearly low per 100 kcal).
- **`AlignmentBars`** — the seven-day strip from saved summaries.
- **`GoalEvaluator`** — the rail: a Today / This week toggle, the score ring,
  readout, helping / working-against-you lists, and the one adjustment. Standard
  quota UX (`AiQuotaHint` / `AiLimitNotice` / `isQuotaError` / `quota.refresh()`),
  same as [AskJournal](../../frontend/src/components/journal/ask-journal.tsx).

Editing is preserved: the old form is extracted verbatim into
[`goal-form.tsx`](../../frontend/src/components/goal/goal-form.tsx) and reused
inside [`edit-goal-modal.tsx`](../../frontend/src/components/goal/edit-goal-modal.tsx),
opened by **Edit goal** (or **Set your goal** from the empty state). The nav entry
is relabelled **Goals**.

**Dropped from the design:** the "Apply to this goal" button on the adjustment —
there's no protein/target field to write to, so applying would be theatre. The
evaluator suggests; it doesn't mutate the goal.

---

## 13.5 How to run & test

```bash
cd backend
uv run pytest tests/test_goal_evaluator.py -v    # scope windows + charge/no-charge wiring
```

The tests fake `generate_structured` (monkeypatched as imported into the service),
so they assert the wiring, not the model: no goal / nothing-logged make no call
and cost no credit; a real eval charges exactly one; and a meal three days ago is
outside `today` but inside `week`.

Manual: `/goal` with a goal set → focus card, today's items tallied, alignment
bars. Rail → **This week** → score + readout + signals + adjustment. Set no goal
→ empty state → **Set your goal** modal fills the dashboard.

---

## 13.6 Gotchas

- **Alignment needs saved summaries.** The strip is only as full as the day
  summaries the user has saved; a fresh account shows all-faint bars. That's
  honest, but worth knowing before reading it as "bad week".
- **Macros can be null.** `FoodItem` calories/protein are nullable, so a tally can
  read low simply because foods aren't estimated yet — the copy says "no nutrition
  yet" rather than "0".
- **The evaluator isn't persisted.** Reloading `/goal` clears the last read; that's
  by design (cheap to regenerate, no stale-cache story). Revisit if we ever want a
  "last evaluated" banner.
- **Consolidating AI is intentional but partial.** We kept the Log page's per-day
  Day Summary this slice (it still powers the Progress page and the alignment
  source). Retiring it in favour of the evaluator is a deliberate follow-up, not a
  silent side effect.

---

## 13.7 Future enhancements

- **Weigh-in history** — a small time-series so progress can be weight-based
  (a real curve), not just elapsed time.
- **Persist the latest evaluation** — a "last evaluated Sunday" banner without a
  re-spend, if usage shows people want it sticky.
- **Retire the per-day summary** — fold it fully into the evaluator once the
  evaluator proves it covers the need (ripples: Progress page, alignment source).
- **Multiple goals + categories** — the design's Personal/Professional grid, if the
  product wants goals beyond health (a real `goals` table + CRUD).
