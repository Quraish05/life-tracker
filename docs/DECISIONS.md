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
