# Decisions & Parked Ideas

> The **why** behind choices, and good ideas deliberately deferred — so ideation
> that happens in conversation survives past the session. Where
> [BUILD-PLAN.md](BUILD-PLAN.md) says *what* we'll build and the
> [handbook](handbook/README.md) says *how the built thing works*, this log says
> *why we chose it* and *what we parked*.
>
> Newest first. Each entry is `decision` (a choice made), `parked` (deferred), or
> `exploring` (still open). Additive only — if a decision is reversed, add a new
> entry that links back; don't rewrite history. Managed with the `park-idea` skill.

---

## 2026-08-03 — Notes redesign: single-select folders (+ tags for AI), split Notes/Journal, checklist as a third kind · _decision_

**Why:** redesigning the Notes page from the mockup raised three coupled choices —
how to categorise notes, whether Notes and Journal share a page, and how to model
checklists.

**Categorise — folder vs. tags:** chose a **new single-select `folder`** field
*and kept the existing free-text `tags` array*, rather than picking one. They
answer different questions: a folder is the one bucket a note lives in (the
mockup's chip counts prove single-membership — 2+1+2+1 = 6), tags are many-per-
note. For "AI-proofing" a controlled single-select folder is the *more* reliable
categorical signal (stable dimension to classify into / aggregate over), while
tags stay open-vocabulary for search + AI suggestion. Rejected *folder-only*
(loses the built tag+AI system) and *tags-only* (single-folder semantics faked on
a multi-value field). Folder is stored as a slug string on `notes` with the
label/colour living on the frontend (`NOTE_FOLDERS`), not a `folders` table —
a per-user folders table with in-app CRUD is **parked** until user-defined
folders are actually wanted.

**Split Notes/Journal:** the one combined `/notes` page (kind toggle) became two
nav items — `/journal` (unchanged UI, journal entries) and `/notes` (the
redesign). Journal's own redesign is parked; it reuses the existing card/editor
so nothing breaks meanwhile.

**Checklist:** modelled as a **third `kind`** (`journal | note | checklist`),
mapping 1:1 to the editor's Note/Checklist toggle, with items in a JSONB `items`
column (`[{text, done}]`). Rejected a separate `is_checklist` boolean / "items is
not null" discriminator as less explicit. Per-kind rules: checklist needs ≥1 item
(body optional); note/journal need a body and carry no items.

**Status:** decided; built this session (folder + items migrations, editor
redesign, `/journal` split, checklist rendering + inline tick-off). Tests green.
**Links:** handbook Ch 4 (Notes & journal); `schemas/note.py`,
`constants/notes.ts`, `note-editor.tsx`.

---

## 2026-08-01 — AI roadmap read against CCAF coverage; prioritise chat+tools, then RAG+evals · _exploring_

**Why:** with the Log-an-entry hub + `/food/frequent` merged (PR #35), asked which
remaining AI/backend features best enhance *both* the product and CCAF exam prep.
Framed the existing roadmap (BUILD-PLAN R3/R4/R5) by which CCAF domain each slice
proves, to find the highest-leverage next work rather than more of the same.

**What we already cover (Domain 4 — structured output):** the three shipped AI
features — nutrition estimation, tag suggestion, follow-up extraction — already
demonstrate CCAF **4.1** (explicit criteria), **4.2** (few-shot), **4.3** (strict
JSON schema + nullable-to-prevent-hallucination + enum/"unclear"), **4.4**
(validation-retry), and **5.5** (confidence → human-in-the-loop), all on the
shared `ai_client.py` engine. So Domain 4 is well-covered; the gaps are elsewhere.

**CCAF-coverage gaps → the slice that fills each (none built yet):**
- **Tool use / function calling + streaming** → Slice 11 (Chat + tools). Largest
  missing capability area; also the strongest product demo ("talk to your tracker").
- **RAG / retrieval / grounding / citations** → Slice 12 (Ask my journal); the
  `note_chunks(embedding vector(768))` schema is already sketched in BUILD-PLAN.
- **Systematic evals (golden sets, LLM-as-judge, prompt-regression in CI)** →
  Slice 12 + R5/D10 (Langfuse + eval harness).
- **Cost/latency observability, prompt caching, budget caps** → R5/A2 (Redis
  caching + distributed rate-limit) and D10; Anthropic prompt caching is a quick
  add to `ai_client.py`.
- **Agentic loop + human-in-the-loop planning** → Slice 13 (Coach agent).
- **Safety / guardrails / PII handling** → *not planned anywhere yet* — a genuine
  gap worth a small dedicated slice.
- **Off-request-path async AI** → R5/B4 (arq + Redis): the inline 5–10s model
  calls become enqueue→return→poll/stream.

**Recommendation (for CCAF breadth-per-hour):** do **Slice 11 (chat + tools,
streaming)** next — it opens the entire tool-use + streaming domain, reuses the
service layer, and is the most demo-able feature. Then **Slice 12 (RAG over
journal) + a golden-set eval**, which is where Langfuse tracing naturally lands.
Infra-first alternative stands (BUILD-PLAN's own order: A1 → A2 → B4 → D10) if
optimising the DevOps résumé angle instead; async AI workers (B4) is the keystone
that makes 11/12/13 production-grade either way.

**Status:** exploring — no slice chosen yet; this is the framing for that choice.
**Links:** BUILD-PLAN R3 (slices 9–13), R5 (A2/B4/D10); handbook Ch 10
(AI nutrition estimation); `ai_client.py`.

---

## 2026-07-30 — Reminder dispatch must survive Render's sleeping free tier · _exploring_

**Why:** Render's free web tier spins the process down after inactivity, so the
in-process `run_dispatch_loop` in `backend/app/services/reminder_dispatch.py`
stops and reminders silently miss. Something always-on must trigger delivery.

**Options considered:**
- **Kubernetes CronJob** — rejected: a managed cluster is always-on only because
  you *pay* for it; it's the wrong tool (orchestration, not scheduling) and
  contradicts the app's $0 premise. Still valuable as a *learning* exercise in
  the local kind sandbox, but not the production fix.
- **Render Cron Job** — architecturally cleanest (decoupled run-and-exit job),
  but Render **bills** cron jobs, so not $0.
- **Paid always-on instance (~$7/mo)** — simplest, but breaks the $0 constraint.
- **External cron → secured endpoint (chosen direction)** — a free scheduler
  pings an idempotent dispatch endpoint every minute.
- Within that: **cron-job.org** (reliable 1-min granularity) over **GitHub
  Actions** (scheduled runs drift 5–15 min and skip under load — unacceptable for
  punctual reminders).
- **Adaptive external scheduling** (reprogram the cron to the next reminder's
  time on every change) — rejected: it couples the reminder write-path to a
  third-party API and loses the catch-up safety net.

**Outcome (proposed):** external scheduler (cron-job.org, 1-min) →
secured `POST /internal/reminders/dispatch` (shared-secret, constant-time
compare) → the already-idempotent `dispatch_once`. Gate the in-process loop with
`REMINDER_DISPATCH_MODE` (`loop` in dev, `endpoint` in prod). Robustness comes
from catch-up idempotency: `dispatch_once` sends *all* currently-due reminders,
so a missed trigger only delays, never drops. Trade accepted: 1-min polling
keeps the free instance perpetually warm (~730/750 hrs) — which doubles as a
no-cold-start keep-warm for demos.

**Status:** pending — user still deciding whether to implement. **Links:**
BUILD-PLAN R5 "Slice 0"; `reminder_dispatch.py`.

---

## 2026-07-30 — R5 platform track: sequence observability → FTS → AI arc · _decision_

**Why:** want to build résumé-grade infra/DevOps skills without dark-app infra
sprints or bolting on tech that isn't load-bearing.

**Outcome:** do the work in this order — (1) **observability thin slice**
(structured logs + request IDs + health split; cheap, $0, makes everything after
debuggable), (2) **FTS search** (small product win; Postgres full-text + GIN;
sets up the contrast for semantic RAG later), (3) **R3 AI arc** (chat, RAG,
coach), folding the *heavy* observability (OTel, Langfuse) into the AI slices
where a slow/costly LLM call makes instrumentation obviously justified.

**Status:** decided. Step 1 shipped (PR #27). **Links:** BUILD-PLAN R5.

---

## 2026-07-30 — Enough features; infra must be load-bearing, not cosplay · _decision_

**Why:** questioned whether to add more CRUD features before infra work.

**Outcome:** the app already has full feature surface (tasks/reminders, meals,
journal, workouts, health goals, daily AI summary, live-sync, Web Push). More
CRUD is diminishing returns and violates the build-plan rule that a feature must
teach a *new* skill. The remaining feature value is the **AI arc (R3/R4)** plus a
single **FTS search** feature. Infra items (R5) are only worth doing where they
serve a *real* concern this app has (e.g. observability for genuinely slow AI
calls) — not as résumé decoration on a single-user app.

**Status:** decided.

---

## 2026-07-30 — Logging library: structlog over stdlib · _decision_

**Why:** the observability foundation needed structured logging.

**Options considered:** **structlog** (industry standard, key/value context
binding, JSON-in-prod / console-in-dev out of the box, one small dep) vs.
**stdlib `logging` + a hand-rolled JSON formatter** (zero deps, but more
boilerplate). Chose structlog for the marketable-skill value and less bespoke
code to maintain.

**Status:** decided; shipped in PR #27. **Links:** handbook Ch 8, `logging.py`.
