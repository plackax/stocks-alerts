# Designli Stocks

A full-stack, real-time stock price alert app: a **React Native + Expo** mobile client backed by a **NestJS** API. The backend streams live trades from [Finnhub](https://finnhub.io/) over a WebSocket, fans prices out to clients via Socket.IO, evaluates user price alerts, and sends an **FCM push** when a target is hit.

## Try it with zero backend setup (easiest)

**The mobile app is already configured to talk to the live backend** at `https://stock-alerts-api-0n4a.onrender.com`. Just build and run the mobile app — it works, no local backend needed.

> Render's free tier spins down when idle, so the **first request after a cold start takes ~50s** while the container wakes; everything is fast after that.

```bash
cd mobile
npm install
npm run android          # or: npm run ios
```

`npm run android` / `npm run ios` produce a local native build (not Expo Go — that's required for FCM push to work). A prebuilt `DesignliStocks-release.apk` and a `DesignliStocks-demo.mp4` are also in the repo root if you just want to install and watch.

Demo login: `test@test.com` / `Test1234!`

## Run locally (optional)

Only if you want to run your own backend instead of pointing at Render.

**Backend env** (`backend/.env`, validated at boot — see `backend/.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `DATABASE_SSL` | no | `true` for managed/external URLs that need SSL, else `false` |
| `JWT_SECRET` | yes | Long random string for signing JWTs |
| `FINNHUB_API_KEY` | yes | Free key from https://finnhub.io/register |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | no | **All-or-nothing.** Without them the app still runs and evaluates alerts — it just skips push delivery. |

**Start the backend:**

```bash
cd backend
cp .env.example .env      # fill in the values above
npm install
npm run start:dev         # watch mode on http://localhost:3000
```

Or run the container via `backend/Dockerfile` (this is what the Render deploy uses). Full deploy steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Mobile env** (`mobile/.env`): set `EXPO_PUBLIC_API_URL` — the only variable the app reads. Point it at Render or your local backend:

| Target | `EXPO_PUBLIC_API_URL` |
|---|---|
| Live backend | `https://stock-alerts-api-0n4a.onrender.com` |
| iOS simulator / physical device | `http://localhost:3000` (or your machine's LAN IP) |
| Android emulator | `http://10.0.2.2:3000` |

**Run the mobile app:** `npm run android` / `npm run ios` for a native build (needed for push), or `npm start` for the Expo dev server.

## Features

Maps to the test's five functional requirements, plus the Docker bonus:

1. **Login / register** — JWT auth; token stored in `expo-secure-store` and sent on REST + the Socket.IO handshake.
2. **Create price alerts** — set a target price per symbol; fires once when the live price rises to or above it (`price >= target`).
3. **Stocks list** — live prices for the tracked symbols over Socket.IO (snapshot on connect, then ticks).
4. **Charts** — a per-symbol price chart, plus an Overview tab plotting all symbols on one normalized (% change) chart.
5. **FCM push** — when an alert triggers, a push is sent to the owner's devices with the symbol and price.
- **Docker** — the backend ships a `Dockerfile` (used by the Render deploy).

Interactive API docs (Swagger) are live at **`https://stock-alerts-api-0n4a.onrender.com/api`** — browse and try the REST endpoints. Push setup details: [docs/PUSH_NOTIFICATIONS_SETUP.md](docs/PUSH_NOTIFICATIONS_SETUP.md).

## Architecture

- **Mobile** — Expo (SDK 56) React Native app: Zustand stores, `expo-router` navigation, Skia/Victory charts, `socket.io-client` for the live feed, Axios for REST.
- **Backend** — NestJS 11 API: owns a single upstream Finnhub WebSocket, keeps an in-memory price cache, broadcasts via a Socket.IO gateway, persists users/alerts in PostgreSQL (TypeORM), and delivers FCM via `firebase-admin`.
- **Flow** — Finnhub WS → a throttled (~400ms) price stream that keeps the latest price per symbol → Socket.IO fan-out to clients **and** alert evaluation → FCM push to **all** of a user's registered device tokens when an alert crosses.
