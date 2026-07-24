# Chapter 3 — Reminders

**Last updated:** 2026-07-24 · **Status:** ✅ current with `feat/adaptive-reminder-dispatch`

A reminder is a time-based nudge: "at 6pm, tell me to work out." This chapter
traces the whole feature — how a reminder is stored, the **two independent
systems** that deliver it, the full round trip from the browser to the database
and back, and the adaptive dispatch loop that decides *when the server wakes up*
to send a push.

---

## 3.1 Mental model — one row, two delivery paths

Everything starts from a single idea:

> A reminder is just a **row with a future timestamp** (`remind_at`) and a
> **"have we delivered it yet?"** flag (`sent_at`). Nothing in the system runs
> on its own at a future time — *something has to be alive and watching the
> clock.* Delivery is the interesting part; storage is trivial.

There are **two entirely separate things** that watch the clock, and confusing
them is the single most common mistake when reasoning about this feature:

| | **Foreground poll** | **Background Web Push** |
|---|---|---|
| Works when the tab is… | **open & visible** only | **closed** too |
| Reaches the user via | an in-app `Notification` + chime | the OS notification tray |
| Path | browser polls `GET /reminders/due` | server → push service → service worker |
| Code | [reminder-notifications.tsx](../../frontend/src/lib/reminder-notifications.tsx) | [reminder_dispatch.py](../../backend/app/services/reminder_dispatch.py) → [sw.js](../../frontend/public/sw.js) |
| Is it a fallback? | Yes — covers users with no push subscription | This is the "real" delivery |

They share only the database row and the `sent_at` flag. **Neither depends on
the other to function.** Web Push works even if no tab is ever opened; the
foreground poll works even if push was never granted.

---

## 3.2 Data model

### `reminders` — [reminder.py](../../backend/app/models/reminder.py)

```
id           int, pk
user_id      int, FK users.id ON DELETE CASCADE, indexed
title        str(120)
body         str(500), nullable
remind_at    timestamptz, indexed        -- when to fire
target_type  str(16),  nullable          -- "note" | "workout" | "meal" | NULL
target_id    int,      nullable          -- the row in that table
sent_at      timestamptz, nullable       -- NULL until delivered
created_at   timestamptz, server default now()
updated_at   timestamptz, server default now(), onupdate now()
```

Two design choices worth internalizing:

- **`remind_at` is indexed** because every delivery query filters on it
  (`WHERE remind_at <= now()`). Without the index, each dispatch tick scans the
  whole table.
- **`target_type` + `target_id` is a _soft_ reference** — deliberately **no
  foreign key**. One reminder may point at a note today, a workout tomorrow; a
  single column can't FK three tables. The trade-off: the database won't stop
  you from pointing at a deleted row, so the API re-validates the target on
  write (`_validate_target` in [reminders.py](../../backend/app/api/routes/reminders.py)).
  `user_id`, by contrast, *is* a hard FK with `ON DELETE CASCADE` — delete a
  user, their reminders go too.

### `push_subscriptions` — [push_subscription.py](../../backend/app/models/push_subscription.py)

One row per browser/device a user has granted push permission on: the push
service `endpoint` plus the `p256dh` / `auth` keys the browser generated.
`user_id` is a cascading FK, so a user can have many subscriptions (laptop +
phone) and losing the user cleans them all up.

`sent_at` on the reminder is the join between these two tables: the dispatch
loop reads due reminders, looks up the owner's subscriptions, pushes, and stamps
`sent_at`.

---

## 3.3 The write path — creating a reminder

Nothing exotic, but two details matter for delivery.

```mermaid
sequenceDiagram
    participant UI as React (useCreateReminder)
    participant API as POST /reminders
    participant DB as Postgres
    participant Loop as Dispatch loop

    UI->>API: { title, remind_at, target? }
    API->>API: _validate_target() (owns the note?)
    API->>DB: INSERT reminder (sent_at = NULL)
    API->>DB: COMMIT
    API->>Loop: signal_reminder_change()   ← wakes the sleeper
    API-->>UI: 201 { reminder }
    UI->>UI: React Query invalidates ["reminders"]
```

- The endpoint calls `signal_reminder_change()` **after** the commit
  ([reminders.py](../../backend/app/api/routes/reminders.py)). That ordering is
  load-bearing — see §3.5.
- On the client, [use-reminders.ts](../../frontend/src/lib/use-reminders.ts)
  invalidates the `["reminders"]` query key on every mutation, so the list (and
  the `["reminders","due"]` child) refetch. The API layer is a thin wrapper in
  [reminders.ts](../../frontend/src/lib/reminders.ts).

---

## 3.4 The read/deliver paths — both directions

### Path A — Foreground poll (tab open)

```mermaid
sequenceDiagram
    participant Note as ReminderNotificationsProvider
    participant API as GET /reminders/due
    participant DB as Postgres

    loop while tab visible & permission granted
        Note->>API: listDue()
        API->>DB: WHERE sent_at IS NULL AND remind_at <= now()
        DB-->>API: due rows
        API-->>Note: [ reminders ]
        Note->>Note: new Notification() + chime, per unseen id
        Note->>API: POST /reminders/{id}/ack  → sets sent_at
    end
```

- Driven by `useDueReminders` — `refetchInterval: 30_000`,
  `refetchIntervalInBackground: false`, so it **pauses when the tab is hidden**.
- A `shown` ref de-dupes within a session so two overlapping polls don't
  double-fire the same reminder before the `ack` round-trips.
- `ack` sets `sent_at` **only if still NULL** (idempotent) — so if push already
  delivered it, the ack is a no-op.

### Path B — Background Web Push (tab closed)

```mermaid
sequenceDiagram
    participant Loop as Dispatch loop
    participant DB as Postgres
    participant Push as Push service (browser vendor)
    participant SW as sw.js (service worker)

    Loop->>DB: due = WHERE sent_at IS NULL AND remind_at <= now()
    Loop->>DB: subscriptions for those user_ids
    loop per reminder
        Loop->>Push: send_web_push(subscription, payload)
        alt 404 / 410
            Push-->>Loop: gone → prune the subscription row
        else delivered
            Push->>SW: push event { title, body, reminderId, url }
            SW->>SW: showNotification(...)
        end
    end
    Loop->>DB: sent_at = now() for reminders that reached ≥1 subscription
    Loop->>DB: DELETE pruned subscriptions
    Loop->>DB: COMMIT
```

Key rules in `dispatch_once()`:

- A reminder is marked `sent_at` **only if at least one push succeeded.** A user
  with zero (or only dead) subscriptions keeps `sent_at = NULL`, so Path A still
  covers them next time they open the app. The two systems back each other up.
- Dead subscriptions (HTTP 404/410 from the push service) are pruned in the same
  pass — see [push.py](../../backend/app/services/push.py). `pywebpush` is
  synchronous, so it's run via `asyncio.to_thread` to not block the loop.
- When the user clicks the OS notification, `sw.js` focuses an existing tab (or
  opens one) at `/reminders`.

---

## 3.5 Deep dive — the adaptive dispatch loop

This is the part built on `feat/adaptive-reminder-dispatch`, and the reason
this chapter exists. **The problem it solves:** the loop used to wake on a fixed
30-second interval. If your only reminder is for tomorrow, that's ~2,880 wakeups
today for nothing.

### The idea: sleep until the next reminder is actually due

```python
# reminder_dispatch.py (shape, not verbatim)
while not stop.is_set():
    _wakeup.clear()                       # (1) clear BEFORE we read
    count    = await dispatch_once(db)    # (2) deliver what's due now
    sleep_for = await seconds_until_next_due(db)   # (3) how long until the next?
    await _sleep_until_due_or_signal(stop, sleep_for)  # (4) sleep, wake early on signal/stop
```

`seconds_until_next_due()` asks the DB for `MIN(remind_at)` among **future,
undelivered** reminders and clamps the wait to `[1s, push_dispatch_max_interval_seconds]`
(default **300s**). If nothing is upcoming, it returns the cap.

### Why "future" and not just "undelivered"?

Because of the un-deliverable overdue case: a reminder whose owner has **no push
subscription** stays `sent_at = NULL` forever and is in the *past*. If the timer
counted it, `MIN(remind_at)` would be behind us → sleep clamps to 1s → the loop
spins forever retrying something it can never push. Counting only *future*
reminders means those overdue orphans don't drive the timer; the max cap retries
them every 5 min at most (and Path A is their real safety net anyway).

### The wake signal — how a "+1 minute" reminder isn't missed

If the loop is asleep until tomorrow and you create a reminder for +1 minute,
the sleep must be *interrupted*. That's `_wakeup`, a module-level
`asyncio.Event`. Every create/update/delete calls `signal_reminder_change()`,
which sets it; `_sleep_until_due_or_signal()` waits on **either** the stop event
**or** the wake event with a timeout, so the signal cuts a 3600s sleep short in
milliseconds. The loop recomputes and re-arms for +1 minute.

```mermaid
sequenceDiagram
    participant API as POST /reminders (+1 min)
    participant Ev as _wakeup (asyncio.Event)
    participant Loop as Dispatch loop (asleep until tomorrow)

    Note over Loop: sleeping on wait(stop OR _wakeup, timeout=~24h)
    API->>API: INSERT + COMMIT
    API->>Ev: signal_reminder_change() → set()
    Ev-->>Loop: wakes immediately
    Loop->>Loop: dispatch_once (nothing due yet)
    Loop->>Loop: seconds_until_next_due → ~60s
    Note over Loop: re-sleeps ~60s, then delivers
```

### The race that the "clear before read" ordering closes

The dangerous interleaving: the loop computes "next is tomorrow," *then* a
create fires the signal, *then* the loop clears the signal and sleeps until
tomorrow — missing the new reminder. We prevent it with two rules working
together:

1. **Endpoints signal _after_ COMMIT**, so a committed change always precedes
   its signal.
2. **The loop clears `_wakeup` _before_ it queries.** So any change is either
   (a) committed before the clear → visible to the query that follows, or
   (b) signalled after the clear → re-sets the event → the next sleep returns
   immediately. There's no ordering where a change is both invisible to the
   query *and* has its signal cleared. Nothing gets slept through.

### Edge cases this design handles

| Case | Behaviour |
|---|---|
| 3 reminders: tomorrow, +1 min, +1 hr | Timer always arms for the *soonest future* one; re-arms after each fires |
| Reminder edited to an earlier time | `update` signals → loop recomputes → shorter sleep |
| Reminder deleted (was the next one) | `delete` signals → loop recomputes → longer sleep |
| Server restart mid-sleep | Loop restarts from the lifespan and recomputes from the DB — nothing persisted in memory matters |
| Owner has no push subscription | Not counted by the timer (avoids spin); retried ≤ every 5 min; delivered by Path A on next app open |
| **Multi-worker** (`uvicorn --workers >1`) | An in-process `Event` doesn't cross processes, so a create in worker A won't instantly wake worker B's loop. The 5-min cap catches it. Fine for single-process dev; see Future Enhancements |

### Lifespan wiring — [main.py](../../backend/app/main.py)

The loop is started as an `asyncio.Task` in the FastAPI `lifespan`, and only
when `push_dispatch_enabled` **and** both VAPID keys are set — otherwise every
tick would fail. On shutdown the `stop` event is set and the task awaited so it
exits cleanly.

---

## 3.6 How to run & test it

1. Generate a VAPID keypair, set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
   `VAPID_SUBJECT` in `backend/.env`, and the public key as
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in the frontend env.
2. Set `PUSH_DISPATCH_ENABLED=true` (and optionally
   `PUSH_DISPATCH_MAX_INTERVAL_SECONDS`, default 300).
3. Start the backend — you should see
   `Reminder dispatch loop started (adaptive, max 300s)`.
4. In the app, grant notification permission (this also registers `sw.js` and
   posts the push subscription), create a reminder ~1–2 minutes out, and watch
   for `Dispatched N reminder(s) via push` in the logs.

> ⚠️ **No automated tests yet** for reminders (only `test_health.py`). The
> async wake/timeout mechanics of the loop have been verified in isolation, but
> the DB-backed paths (`dispatch_once`, `seconds_until_next_due`) are covered
> only by manual testing. First test-writing job: `httpx.AsyncClient` +
> `ASGITransport` integration tests (see the event-loop gotcha below).

---

## 3.7 Gotchas learned

- **Plan said APScheduler; we shipped an asyncio loop.** [BUILD-PLAN.md](../BUILD-PLAN.md)
  D4/Slice 8 named APScheduler. A plain in-process `asyncio` task turned out to
  be enough and one fewer dependency — the plan documents intent, this chapter
  documents reality.
- **`TestClient` fights the async engine.** Starlette's `TestClient` +
  async SQLAlchemy raises "attached to a different loop." Use
  `httpx.AsyncClient` + `ASGITransport` inside one event loop instead.
- **The dev Postgres is shared across feature branches.** A migration on one
  branch can leave the DB ahead of another branch's migration chain. Watch for
  "column already exists" surprises.
- **`Date.now()` equivalents in the loop use the DB clock, not the app clock.**
  Due comparisons use `func.now()` (Postgres) so they're consistent regardless
  of the server's wall clock. The *foreground* poll, by contrast, is a fixed
  client-side interval.

---

## 3.8 Future enhancements

Roughly ordered by value-to-effort:

1. **Frontend "sleep until due" (finish the original complaint).** The foreground
   `/due` poll is still a fixed 30s HTTP poll. The client already loads the full
   reminders list, so it could compute the soonest future reminder and
   `setTimeout` to exactly then, re-arming when the list changes — with a single
   `/due` fetch *when the timer fires* to confirm against the DB clock and catch
   the no-subscription case. Eliminates the wasteful browser-side polling.
2. **Automated tests.** Integration tests for the CRUD + delivery paths, and a
   focused test that `signal_reminder_change()` actually shortens the loop's
   sleep. Highest correctness ROI.
3. **iOS / iPadOS push.** Needs a PWA: web manifest (`app/manifest.ts`) + icons +
   an "Add to Home Screen" hint. iOS only delivers Web Push when the app is
   installed to the Home Screen.
4. **Multi-worker correctness.** If the API ever runs with `>1` worker, the
   in-process wake signal won't cross processes. Options: run the dispatcher as a
   single dedicated process, or replace the in-process `Event` with Postgres
   `LISTEN/NOTIFY` so any worker's write wakes the one loop.
5. **Recurring reminders.** Today every reminder is one-shot (`sent_at` ends its
   life). A `recurrence` rule (RRULE-style) would re-arm `remind_at` after each
   fire instead of stamping `sent_at` permanently.
6. **Snooze & richer actions.** Notification action buttons ("snooze 10 min",
   "done") handled in `sw.js` → a small backend endpoint that bumps `remind_at`.
7. **Retry/backoff for transient push failures.** Right now a transient (non
   404/410) failure just waits for the next tick. A per-subscription backoff
   would improve reliability without hammering a struggling push service.
8. **Timezone-aware scheduling UX.** `remind_at` is stored `timestamptz`
   (correct), but the picker/relative-time UI should make the user's zone
   explicit so "9am" always means their 9am.
