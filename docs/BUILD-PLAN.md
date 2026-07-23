# Life Tracker — Build Plan (Tech Lead cut)

**Written:** Jul 22, 2026 · **Owner:** Quraish
**Premise:** ship a usable app in ~10 days, then layer features. Every feature exists to (a) be genuinely useful daily and (b) teach one target skill. If a feature does neither, it's cut.

## The one product idea that holds it together

> **"Your day, in one place — and an AI that has actually read it."**

Everything — meals, workouts, tasks, journal — is a *log against a day*. The home screen is **Today**: what's due, what you ate, did you train, one journal box. The AI features all derive their power from this: because the app knows your days, summaries/chat/RAG/coach are meaningful. One concept, one mental model, one screen to demo.

## Decisions (made, not open for re-litigation until R2)

| # | Decision | Why |
|---|---|---|
| D1 | **Journal and Notes are one feature** — a `notes` table with `kind: journal\|note`; journal = one note pinned to a date | Two features, one implementation. One editor, one CRUD, one RAG corpus later |
| D2 | **Meals are free text** ("2 rotis, dal, salad") — no food database, no dropdowns | Logging friction kills trackers. LLM estimates macros from text later — that *is* the AI feature |
| D3 | **Workouts = routine template + daily check-off.** Routine is a name + JSON list of exercises; a log row per day | No exercise DB, no sets/reps analytics in v1. "Did I train today" is the actual user need |
| D4 | **Reminders = `remind_at` on tasks + browser Web Push**, fired by APScheduler inside FastAPI | No email vendor, no cron infra, free. Push subscription + a scheduler loop is real backend learning |
| D5 | **Keep email/password auth, add Google SSO as second provider** | Password auth is done and works; SSO added per roadmap Module 03 — supporting both is more impressive anyway |
| D6 | **AI ships in this order: Summary → Chat+tools → RAG → Coach** | Each step reuses the last. Summary is a single prompt (1 evening, huge demo value); Coach is 3 weeks. Momentum first |
| D7 | **Every PR is a vertical slice** — model → migration → route → test → UI, one feature end-to-end | No "backend sprint" that leaves the UI dark for weeks. The app is always demoable |
| D8 | **UI stays on shadcn defaults.** Timebox styling to 20% of any slice | You already know frontend; it's not what this project is for |

## Not building (write it down so it stays dead)

Streaks/gamification · calendar month view · social/sharing · photo uploads (storage costs + scope) · food/nutrition database · mobile app · offline mode · themes. Any of these can be a v2 — after real users ask.

## Data model (final for R1–R3)

```
users         (done)
tasks         id, user_id, title, status, priority, due_at, remind_at, created_at
notes         id, user_id, kind(journal|note), title, body_md, entry_date?, updated_at
meals         id, user_id, eaten_at, meal_type(breakfast|lunch|dinner|snack),
              description, ai_macros jsonb?, created_at
routines      id, user_id, name, days int[], exercises jsonb   -- [{name, sets?, reps?}]
workout_logs  id, user_id, date, routine_id?, done bool, notes?, completed jsonb?
push_subs     id, user_id, endpoint, keys jsonb                 -- Web Push
-- R3:
note_chunks   id, note_id, user_id, chunk_text, embedding vector(768)
conversations / messages
```

Drop the scaffold `items` table in the next migration — dead weight.

## Releases

### R1 — "It's real" · target **Aug 2** (~10 days)

The app is deployed; a stranger can register, log their day, and come back tomorrow to find it.

| Slice | Contents | Teaches |
|---|---|---|
| 1. Tasks | CRUD + status toggle + due date, Today shows due/overdue | FastAPI patterns, Pydantic, service layer, pytest |
| 2. Meals | Quick-add free text + meal type, Today shows today's meals | More CRUD reps — should take half the time of slice 1 |
| 3. Journal/Notes | Editor (plain textarea + markdown preview), Today shows "write today's entry" | D1 payoff; markdown rendering you already know |
| 4. Workouts | Routine CRUD + today's check-off card | JSONB columns, slightly richer modeling |
| 5. Deploy | Render (API) + Vercel (web) + Neon (DB), CORS/cookies sorted, `/health` warm-up ping | Module 10 topology, the classic cross-origin cookie fight |
| 6. Google SSO | "Continue with Google" next to password login | OIDC flow, Module 03 |

Definition of done: you personally log meals + workout + journal in the **deployed** app for 3 consecutive days. Dogfooding is the QA plan.

### R2 — "It's alive" · target **Aug 16**

| Slice | Contents | Teaches |
|---|---|---|
| 7. Live sync | WebSocket `/ws`, auth'd handshake, task/meal events broadcast; edit on phone → laptop updates | Module 04 in full |
| 8. Reminders | `remind_at` picker, Web Push subscribe flow, APScheduler loop firing pushes, "remind me about workout at 6pm" | Background jobs, push protocol, VAPID keys |

### R3 — "It's smart" · target **Sep 6**

| Slice | Contents | Teaches |
|---|---|---|
| 9. Meal AI | Nightly + on-demand: macro estimates on free-text meals (`ai_macros`), and **"Your week in food"** summary card | Module 05 basics: one well-designed prompt, structured output, provider abstraction (Gemini free tier), budget caps table |
| 10. Journal AI | Weekly journal digest ("themes, mood, wins") on Today every Monday | Prompt reuse; first scheduled AI job |
| 11. Chat + tools | "Add gym tomorrow 6pm", "what did I eat yesterday?" — streaming chat, 4 tools over the service layer | Module 05 in full: tool loop, streaming, prompt regression tests |
| 12. Ask my journal | RAG over notes/journal: chunk → embed → pgvector → cited answers; 30-case golden set in CI | Module 06; Langfuse tracing wired to all AI features here |

### R4 — "It coaches" · target **Sep 27**

Slice 13: the Coach agent (LangGraph): reads last 2 weeks of meals/workouts/tasks → proposes next week's plan → you approve → tasks/reminders created. Human-in-the-loop, traced, eval'd. Then Phase-5 polish: demo account, README, video, Cloud Run migration.

## Weekly operating rhythm

- **One slice at a time.** A slice merges only when: migration + tests pass in CI, deployed, and you wrote the PR description explaining the code (comprehension contract).
- Friday: 30-min self demo — click through the deployed app as a user would.
- If a slice runs >1.5× estimate, cut its scope, not the release date. R1 slipping past Aug 2 means slices 3–4 lose features, not that deploy moves.
- Claude usage per the roadmap: scaffolding/review/quiz yes; first drafts of service-layer logic, no.

## What this arc gives the resume

R1 proves full-stack fundamentals (the floor). R2 proves real-time systems. R3 proves the three highest-demand AI skills (LLM apps, RAG, evals). R4 proves agents + LLMOps. One URL demonstrates all of it — and you'll have used the app yourself for two months by then, which shows in every demo.
