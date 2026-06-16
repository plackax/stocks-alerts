# Deploying the backend (free tier)

This guide deploys the NestJS backend to a free cloud host. **Render** is the primary path; **Railway** notes follow at the end. Both work with the existing `backend/Dockerfile` and a single managed PostgreSQL connection string — no code changes required.

## What the deploy needs

- A PostgreSQL database (the host provides a connection string).
- The backend running as a container from `backend/Dockerfile`.
- A handful of environment variables (below).

The app listens on the platform-provided `PORT` and binds `0.0.0.0`, so it works on any PaaS that injects `PORT`. Leaving `NODE_ENV` unset runs the **demo profile**: TypeORM `synchronize` creates the schema automatically on boot, and the `POST /dev/simulate` endpoint is available so a reviewer can trigger a price-cross (and a push notification) without waiting for market hours.

## Deploy on Render

### 1. Create a free PostgreSQL instance

1. In the Render dashboard: **New → PostgreSQL**.
2. Pick the **Free** instance type, name it, and create it.
3. Once it is live, open the database page and copy the **Internal Database URL** (starts with `postgres://`). Use the *internal* URL — it is reachable from your Render service without SSL and avoids the external-URL latency.

### 2. Create the Web Service

1. **New → Web Service**, connect this repository.
2. **Root Directory**: `backend`
3. **Runtime**: Docker (Render auto-detects `backend/Dockerfile`).
4. Instance type: **Free**.

### 3. Set environment variables

On the Web Service, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Render Postgres **Internal Database URL** |
| `DATABASE_SSL` | `false` (the internal URL does not use SSL) |
| `JWT_SECRET` | a long random string |
| `FINNHUB_API_KEY` | your Finnhub API key (https://finnhub.io/register) |
| `FIREBASE_PROJECT_ID` | from your Firebase service account |
| `FIREBASE_CLIENT_EMAIL` | from your Firebase service account |
| `FIREBASE_PRIVATE_KEY` | from your Firebase service account (keep the `\n` escapes) |

Notes:
- Do **not** set `NODE_ENV` — leaving it unset selects the demo profile (schema auto-created, `/dev/simulate` available).
- Do **not** set `PORT` — Render injects it and the app reads it automatically.
- The three `FIREBASE_*` vars are all-or-nothing: set all three, or none. With none set, the backend still runs and evaluates alerts — it just skips push delivery and logs a warning. Push notifications require all three.
- If you ever use the **External** Database URL instead of the internal one, set `DATABASE_SSL=true`.

### 4. Deploy and verify

Render builds the image and starts the service. When it is live:

- `GET https://<your-service>.onrender.com/health` returns a health payload (it includes a live database ping, so a `200` confirms the DB connection works).
- Interactive API docs (Swagger) are served at `https://<your-service>.onrender.com/api`.
- `POST https://<your-service>.onrender.com/dev/simulate` starts the price simulator so alerts fire without live market data.

The service is exposed on the platform `PORT` automatically; you do not manage ports yourself.

### Free-tier cold start

Render free Web Services spin down after about 15 minutes of inactivity. The **first request after idle takes ~50s** while the container wakes up; subsequent requests are fast. This is expected on the free tier — keep it in mind when a reviewer first hits the URL.

## Railway notes

The flow is the same; only the dashboard differs:

1. Add a **PostgreSQL** plugin — Railway exposes its connection string as the `DATABASE_URL` variable.
2. Create a service from this repo with **root directory `backend`**; Railway builds the `Dockerfile`.
3. Reference the database's `DATABASE_URL` on the service and add the same `JWT_SECRET`, `FINNHUB_API_KEY`, and `FIREBASE_*` variables. Railway also injects `PORT` automatically.
4. Railway's managed Postgres typically requires SSL over its connection string — set `DATABASE_SSL=true` if connections are rejected without it.

Leaving `NODE_ENV` unset keeps the demo profile here too.
