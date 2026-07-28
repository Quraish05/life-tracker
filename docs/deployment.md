# Deployment

How Life Tracker is deployed so it's reachable from any device (including your
phone). Three services, all on free tiers:

| Piece | Host | Notes |
|-------|------|-------|
| Frontend (Next.js) | **Vercel** | Free hobby tier, HTTPS, serves the push service worker. |
| Backend (FastAPI) | **Render** | Free web service. Sleeps after ~15 min idle (cold start ~30–60s); fine for personal use. |
| Database (Postgres) | **Neon** | Free *persistent* serverless Postgres. |

Backend config lives in `backend/`: [`Dockerfile`](../backend/Dockerfile),
[`entrypoint.sh`](../backend/entrypoint.sh), [`.dockerignore`](../backend/.dockerignore).
The Render service is described by [`render.yaml`](../render.yaml) at the repo root.

> **Free-tier trade-off:** the backend sleeps when idle, so the first request
> after a quiet spell is slow, and the background reminder-push loop can't run
> (it needs an always-on process). Both are fine for now — server-side push is a
> deferred follow-up anyway. Upgrade the Render service to a paid plan later to
> get always-on + push.

---

## One-time prerequisites

- Accounts: [Neon](https://neon.tech), [Render](https://render.com), [Vercel](https://vercel.com) — all can sign in with GitHub.
- Generate a production JWT secret (paste it as an env var in Step 2):
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

Everything deploys straight from the GitHub repo — no CLI required.

---

## Step 1 — Database (Neon)

1. Create a Neon project (pick a region near Render's, e.g. Singapore).
2. Copy the **connection string** — looks like
   `postgresql://user:pass@ep-xxx.<region>.aws.neon.tech/dbname?sslmode=require`.
   Paste it as-is; the app normalizes the scheme and SSL options for asyncpg
   automatically (`config._normalize_database_url`).

---

## Step 2 — Backend (Render)

Render reads [`render.yaml`](../render.yaml) as a **Blueprint**:

1. Render dashboard → **New → Blueprint** → connect this GitHub repo.
2. Render detects `render.yaml` and proposes the `life-tracker-api` web service
   (Docker, `backend/` root, free plan). Approve it.
3. Fill in the environment variables it marks as required (these are the
   `sync: false` secrets — never committed):
   - `DATABASE_URL` — the Neon string from Step 1
   - `SECRET_KEY` — the token from prerequisites
   - `ANTHROPIC_API_KEY` — your key (or set `AI_PROVIDER=gemini` + `GEMINI_API_KEY`)
   - `SUPERADMIN_EMAIL` — the email you'll register with (unlimited AI)
   - `CORS_ORIGINS` — leave a placeholder like `["https://example.vercel.app"]`
     for now; we fix it in Step 4.
4. Deploy. On boot, [`entrypoint.sh`](../backend/entrypoint.sh) runs
   `alembic upgrade head` against Neon, then starts the server.
5. Note the URL: `https://<service>.onrender.com`. Check it:
   ```bash
   curl https://<service>.onrender.com/api/v1/health   # -> {"status":"ok",...}
   ```

---

## Step 3 — Frontend (Vercel)

1. Vercel → **Add New → Project** → import the repo.
2. **Set the Root Directory to `frontend`** (the app isn't at the repo root).
   Framework auto-detects as **Next.js**.
3. Environment variable:
   - `NEXT_PUBLIC_API_URL = https://<service>.onrender.com`
   - (Later, for push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY = …`)
4. Deploy. Note the URL: `https://<project>.vercel.app`.

---

## Step 4 — Connect them (CORS)

The backend only accepts browser requests from origins in `CORS_ORIGINS`. In the
Render dashboard → your service → **Environment**, set:

```
CORS_ORIGINS = ["https://<project>.vercel.app"]
```

(A JSON array — quotes and brackets matter.) Saving triggers a redeploy. Open
the Vercel URL, register, and you're live.

---

## Step 5 — Make yourself the superadmin

`SUPERADMIN_EMAIL` is promoted to superadmin on every boot. So:

1. Register an account on the deployed site using that exact email.
2. Restart the service (Render → **Manual Deploy → Restart service**, or just
   redeploy) so the bootstrap runs. That account now has unlimited AI; everyone
   else gets the free quota (10 calls). *Verified locally: after a restart the
   account comes back as `role: superadmin`, `ai_remaining: null`.*

---

## Using it on your phone

- Open the Vercel URL in mobile Safari/Chrome and **Add to Home Screen** — it
  behaves like an app (the service worker ships in `frontend/public/sw.js`).
- The first load after the backend has been idle takes ~30–60s (free-tier cold
  start); it's snappy after that until it goes idle again.

---

## Routine redeploys

Both services auto-deploy on push to the connected branch:
- **Backend:** each deploy re-runs `alembic upgrade head` via the entrypoint.
- **Frontend:** Vercel rebuilds automatically.

---

## Deferred follow-ups

- **Server-side reminder push** (fires when the app is closed): needs an
  always-on backend, so first upgrade the Render service off free. Then generate
  a VAPID keypair (`npx web-push generate-vapid-keys`), set `VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` + `PUSH_DISPATCH_ENABLED=true` on the
  backend, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on the frontend.
- **Email verification** (parked earlier): Gmail SMTP + gate AI behind a
  verified email.
