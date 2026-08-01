# Chapter 10 — AI nutrition estimation (schema-constrained structured output)

**Last updated:** 2026-07-31 · **Status:** ✅ current with `redesign/food-nutrition-ai` (PR #34)

**Why we did this.** A food carries per-serving calories and macros, but nobody
wants to look those up by hand for every dish they save. So we let the model do
the tedious part: given a food's name and the ingredients you've typed, it
*proposes* the four numbers and drops them into the editor, where you keep or
correct them before saving. It's also the first AI feature in the *food* domain
(the earlier two live in notes), so it's the reference for "how an AI feature is
wired here" end-to-end.

**What the feature does.** `POST /food/estimate-nutrition` takes a food's *draft*
text (name + ingredient lines, **not** a saved id) and returns
`{ calories, protein_g, carbs_g, fat_g, model }` — per-serving whole numbers plus
the model that produced them. Nothing is written; the client fills the numbers
into the food editor. The estimate is **schema-constrained**: the model must
answer through a strict JSON schema, and the result is validated (with a
retry-on-failure) before it ever leaves the server.

---

## 10.1 Mental model — the model proposes, the validator disposes

> The AI is a *suggestion engine sitting behind a hard contract*, not a source of
> truth. It never writes to the database and never returns free-form prose — it
> fills a fixed JSON shape (`calories, protein_g, carbs_g, fat_g`, all
> non-negative integers) or the request fails cleanly. The columns those numbers
> map onto are **nullable and user-editable**, so a rough estimate is fine and a
> wrong one is one keystroke from corrected.

Three ideas worth internalizing before reading the code:

- **Content-in-body, not an id.** The endpoint estimates from the draft you're
  *currently typing*, so it works before the food exists and reflects the
  ingredients on screen right now. (Same pattern as the note tag-suggester.)
- **Structured output is enforced at two layers.** The provider is *told* to emit
  JSON matching a schema, and the server *re-validates* that JSON into a Pydantic
  model. Belt and braces — the model can still fumble, and we catch it.
- **The AI mechanism is shared, the prompt is not.** All the provider plumbing
  (client, dispatch, validate-retry) lives once in `ai_client.py`; each feature
  contributes only its prompt + output schema. Nutrition estimation is ~40 lines
  on top of that engine.

---

## 10.2 The contract — three schemas, one shape

[food_ai.py](../../backend/app/schemas/food_ai.py) defines the request/response,
and [nutrition_estimation.py](../../backend/app/services/nutrition_estimation.py)
holds the JSON Schema the model is constrained to:

```python
# schemas/food_ai.py — what crosses the wire
class NutritionEstimateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    ingredients: list[Ingredient] = Field(default_factory=list)

class NutritionEstimate(BaseModel):            # the validation target
    calories: int = Field(ge=0, le=MAX_CALORIES)
    protein_g: int = Field(ge=0, le=MAX_MACRO_G)
    carbs_g: int = Field(ge=0, le=MAX_MACRO_G)
    fat_g: int = Field(ge=0, le=MAX_MACRO_G)

class NutritionEstimateResponse(NutritionEstimate):
    model: str                                 # + which model produced it (transparency)
```

```python
# nutrition_estimation.py — what the provider is forced to emit
_SCHEMA = {
    "type": "object",
    "additionalProperties": False,             # no extra keys
    "required": ["calories", "protein_g", "carbs_g", "fat_g"],  # all four, always
    "properties": { …four "integer", "minimum": 0 fields… },
}
```

Two things to notice:

- **Every macro is required on the way *out* of the model** (the AI must commit to
  a number, even a rough one) — but they map onto the food's **nullable** columns
  on save, so a food can still have "no nutrition yet".
- **`MAX_CALORIES` / `MAX_MACRO_G` are shared** with `FoodItemBase`
  ([food.py](../../backend/app/schemas/food.py)), so the same sanity bounds catch a
  runaway estimate here and a fat-fingered manual entry there.

---

## 10.3 The flow, both directions

```
Food editor ── "✨ Ask AI" ─────────────────────────────────────────────┐
 nutrition-fields.tsx: askAi()                                           │
   useEstimateNutrition().mutate({ name, ingredients })                  │  (only non-blank
        │                                                                │   ingredient rows)
        ▼                                                                │
 POST /api/v1/food/estimate-nutrition                                    │
        │                                                                │
        ▼                                                                │
 routes/food.py::estimate_food_nutrition                                 │
   1. enforce_ai_quota(user)          → 429 if the free pool is spent    │
   2. with ai_errors_as_http(…):      → AI exceptions → 503 / 502        │
        estimate, model = await estimate_nutrition(name, ingredients)    │
   3. record_ai_usage(user, db)       → +1 credit, ONLY after success    │
   4. return NutritionEstimateResponse(model=model, **estimate)          │
        │                                                                │
        ▼                                                                │
 services/nutrition_estimation.py::estimate_nutrition                    │
   - builds the system prompt + the user message from the draft          │
   - calls the shared engine with _SCHEMA + NutritionEstimate            │
        │                                                                │
        ▼                                                                │
 services/ai_client.py::generate_structured   ← the reusable core        │
   - resolve provider + model                                            │
   - loop (≤2): call model → validate JSON → on failure, retry w/ error  │
        │                                                                │
        ▼                                                                │
   _generate_anthropic()  /  _generate_gemini()  →  Claude / Gemini      │
        │                                                                │
        ▼                                                                │
   raw JSON  →  NutritionEstimate.model_validate_json(raw)               │
        │                                                                │
        └───────────► { calories, protein_g, carbs_g, fat_g, model } ────┘
                          │
                          ▼
        onSuccess: setValue() each macro field → user edits/saves
```

**Forward (frontend → model).** The editor's nutrition section
([nutrition-fields.tsx](../../frontend/src/components/food/nutrition-fields.tsx))
watches the live `name` + `ingredients` via `useWatch`. The **✨ Ask AI** button
is disabled until there's a name and is greyed when out of credits. On click,
`useEstimateNutrition` ([use-food.ts](../../frontend/src/lib/queries/use-food.ts))
POSTs the draft — filtering out half-typed ingredient rows client-side first
(the server drops them too, but this keeps the payload honest).

**Back (model → fields).** On success the mutation's `onSuccess` writes each of
the four numbers into the form with `setValue(name, data[name], { shouldDirty: true })`,
then refreshes the quota badge. The values are now just editable inputs — the
"✨ Estimated by AI — edit any value to correct it" line makes the proposal
explicit. The user saves the food through the normal create/update path; the AI
was never in the write path.

---

## 10.4 The tricky part — the shared structured-output engine

Everything above §10.3's midpoint is feature-specific glue. The actual
model call and the guarantee of a well-shaped result live in
[`generate_structured`](../../backend/app/services/ai_client.py) — reused verbatim
by the note tag-suggester and follow-up extractor.

```python
async def generate_structured(*, system, user_message, anthropic_schema,
                              response_model, max_attempts=2):
    provider, model = resolve_provider_and_model()          # or raise AINotConfiguredError
    turns = [{"role": "user", "content": user_message}]

    for attempt in range(max_attempts):
        raw = await generate(system=system, turns=turns, provider=provider,
                             model=model, anthropic_schema=anthropic_schema,
                             gemini_schema=response_model)
        try:
            return response_model.model_validate_json(raw), model     # ✅ shaped & valid
        except ValidationError as exc:
            # Retry-with-error-feedback: hand the model its own bad output + the
            # exact error, and ask for a corrected response.
            turns.append({"role": "assistant", "content": raw})
            turns.append({"role": "user", "content":
                f"That response failed validation:\n{exc}\n\nReturn a corrected response…"})

    raise AIError("Model did not return a valid structured response after retries.")
```

Two mechanisms carry the weight:

- **Provider-agnostic dispatch.** `generate()` branches on
  `settings.ai_provider`. `_generate_anthropic` uses Claude's
  `output_config={"format": {"type": "json_schema", "schema": …}}`;
  `_generate_gemini` passes the Pydantic model as `response_schema` with
  `response_mime_type="application/json"`. **Same contract, two SDK dialects** —
  callers pass both forms (`anthropic_schema` dict + `response_model` for Gemini)
  and never care which runs. Flip `AI_PROVIDER=gemini` and this feature moves
  providers with zero feature-code change. Defaults: `claude-haiku-4-5` /
  `gemini-flash-latest`.
- **Validate-and-retry (bounded).** First attempt + one correction retry
  (`_DEFAULT_MAX_ATTEMPTS = 2`). The retry is a *correction path*, not a primary
  strategy — it feeds the model back its invalid JSON and the precise
  `ValidationError`, then gives up rather than looping forever. This is why a
  momentary schema slip self-heals but a broken model doesn't hang the request.

---

## 10.5 Cost control & failure mapping — ordering matters

The route is deliberately choreographed so **a failed call never costs a credit**:

- **`enforce_ai_quota(user)` first** ([ai_quota.py](../../backend/app/api/ai_quota.py)) —
  regular users share a lifetime pool of `settings.ai_free_limit` (10) calls
  across *every* AI feature; the superadmin is exempt. Over the cap → **429**
  before any model work.
- **`record_ai_usage(user, db)` last** — only *after* the estimate succeeds. So a
  missing key (503) or a model error (502) leaves the pool untouched.
- **`ai_errors_as_http(…)`** ([ai_errors.py](../../backend/app/api/ai_errors.py))
  wraps the `await` and translates service exceptions: `AINotConfiguredError` →
  **503** (surfacing the "check your API key" setup message), any other `AIError`
  → **502** with a generic retryable detail. The frontend distinguishes the 429
  (`isQuotaError`) to show the "out of free actions" notice vs. a transient error.

---

## 10.6 How to run & test

```bash
cd backend
# Configure a provider (either works):
#   AI_PROVIDER=anthropic  ANTHROPIC_API_KEY=sk-…
#   AI_PROVIDER=gemini     GEMINI_API_KEY=…           # free flash tier
uv run pytest tests/test_food_ai.py -v                # estimator unit tests (model faked)
uv run pytest tests/test_food_activity.py -v          # incl. estimate → quota wiring
```

Tests **fake the model** (`monkeypatch` on `estimate_nutrition`) so they assert
the *wiring* — that a success charges exactly one credit
(`test_estimate_returns_values_and_charges_quota` in
[test_food_activity.py](../../backend/tests/test_food_activity.py)) — without a
real API call or a network dependency. Manual end-to-end: open the food editor,
type a name + ingredients, hit **✨ Ask AI**.

---

## 10.7 Gotchas

- **Route ordering** — `/food/estimate-nutrition` and `/food/frequent` are
  declared **before** `/food/{food_id}`; otherwise `estimate-nutrition` gets tried
  as a `food_id` and 422s. (Same rule as FTS `/search`, Ch 9.)
- **Charge after success, not before** — moving `record_ai_usage` above the AI
  call would bill users for outages. Keep it last.
- **Required out, nullable in** — the model must return all four macros, but the
  DB columns are nullable; don't "tighten" the food schema to match the estimator.
- **Provider schema shapes differ** — Anthropic wants a raw JSON-Schema dict,
  Gemini wants the Pydantic model. `generate_structured` takes both; a new AI
  feature must supply both, not one.
- **`gemini-flash-latest` is an alias** — it tracks Google's current free flash
  model so it won't 404 as versions rotate; pin `AI_MODEL` for reproducible
  behavior.

---

## 10.8 Future enhancements

- **Snapshot macros onto the meal log** — like `MealLog.food_name`, capture the
  food's calories/macros at log time so a day's totals survive later edits to the
  food (the planned "meal-log nutrition snapshot" slice).
- **Batch / re-estimate** — a "re-estimate all foods missing nutrition" action
  reusing the same service over a list.
- **Confidence & provenance** — the response already carries `model`; a
  confidence hint or per-ingredient breakdown would make corrections cheaper.
- **Shared-engine chapter** — `generate_structured` now backs three features
  (tag-suggest, follow-ups, nutrition); it deserves its own cross-cutting chapter
  with this one as the worked example.
