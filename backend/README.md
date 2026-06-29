# Backend — Job Application Command Centre

FastAPI service that bridges the **frontend (Firebase Auth)** and the **Lemma
pod** (`job-application-command-centre`). It holds the Lemma credentials
server-side (never exposed to the browser), verifies Firebase ID tokens on
protected routes, and proxies work to Lemma agents + functions.

## What it does

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | none | Proves the backend can reach the Lemma pod (lists tables). |
| `POST /api/auth/signup` | none | Username + password -> bcrypt hash stored in Firestore -> returns session JWT. |
| `POST /api/auth/login` | none | Verifies creds against Firestore -> returns session JWT. |
| `GET /api/me` | session JWT | Returns the signed-in username. |
| `POST /api/applications/parse-jd` | session JWT | Creates an `applications` row -> runs `jd-parser-agent` -> persists with `apply_jd_parse`. Returns structured fields. |
| `GET /api/applications` | session JWT | Lists applications from the Lemma pod. |

### Auth model (backend-owned, no Firebase console changes)
- Sign-up/login take **only a username + password** (no email, no Google).
- The backend bcrypt-hashes the password and stores the user in **Firestore** at
  `app_users/{username}` via the Firestore REST API + the Web API key — **no
  service-account key, and the Email/Password provider is *not* used**, so there
  is nothing to enable in the Firebase console.
- On success the backend issues its own HS256 session JWT (signed with
  `SESSION_JWT_SECRET`). Protected routes verify that JWT (`app/auth.py`).

### Lemma token handling (important)
Lemma issues a short-lived **access token** (1 h) and a **rotating refresh
token** (reusing a refresh token triggers "token theft" and revokes the whole
family). The backend's `_TokenManager`:
- refreshes the access token ~5 min before expiry,
- keeps the rotated refresh token in memory **and persists it** to
  `LEMMA_SESSION_FILE`, so a single deployed instance survives restarts,
- retries once on a 401 by force-refreshing.

Because the refresh token rotates and is single-consumer, **only one process may
use a given seed**. Don't run `lemma` CLI commands that refresh while the backend
is live against the same account, or you'll revoke the family and need to
re-seed (see below).

## Run locally

```bash
cd backend
cp .env.example .env          # then fill in real values (see below)
uv venv .venv --python 3.12   # or: python -m venv .venv  (use Python 3.12)
uv pip install -r requirements.txt --python ./.venv/Scripts/python.exe

# The real Lemma SDK is vendored under ./vendor (PyPI's lemma-sdk is an empty
# placeholder). Locally it's also importable; for Docker it's put on PYTHONPATH.
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
# -> http://localhost:8000/api/health
```

### Filling `.env`
Get the Lemma values from `~/.lemma/config.json` after `lemma auth login`
(`servers.cloud.token`, `servers.cloud.refresh_token`,
`servers.cloud.defaults.org_id` / `pod_id`):

```
LEMMA_BASE_URL=https://api.lemma.work
LEMMA_ORG_ID=<defaults.org_id>
LEMMA_POD_ID=<defaults.pod_id>
LEMMA_TOKEN=<token>                 # access token (auto-refreshed)
LEMMA_REFRESH_TOKEN=<refresh_token> # rotating; seed value
FIREBASE_PROJECT_ID=jobapplicationcenter
FIREBASE_API_KEY=<firebase web api key>     # for Firestore REST (public-by-design)
SESSION_JWT_SECRET=<random string>          # python -c "import secrets;print(secrets.token_urlsafe(48))"
FRONTEND_ORIGIN=http://localhost:3000       # comma-separate to add the Netlify URL
LEMMA_SESSION_FILE=/tmp/lemma_session.json
```

If you ever see `INVALID_REFRESH_TOKEN / token theft detected`: the family was
revoked. Run `lemma auth login` again, delete the persisted session file
(`rm /tmp/lemma_session.json`), and re-seed `LEMMA_TOKEN` + `LEMMA_REFRESH_TOKEN`
in `.env`.

## Deploy on HuggingFace Spaces (Docker)

1. Create a **Docker** Space.
2. Push this `backend/` folder (including `vendor/`) as the Space repo. The
   `Dockerfile` listens on `$PORT` (HF sets 7860).
3. Add Space **secrets** (Settings -> Variables and secrets): `LEMMA_BASE_URL`,
   `LEMMA_ORG_ID`, `LEMMA_POD_ID`, `LEMMA_TOKEN`, `LEMMA_REFRESH_TOKEN`,
   `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `SESSION_JWT_SECRET`,
   `FRONTEND_ORIGIN` (your Netlify URL).
4. (Recommended) Enable **persistent storage** and set
   `LEMMA_SESSION_FILE=/data/lemma_session.json` so the rotated refresh token
   survives restarts. Without it, each cold restart falls back to the `.env`
   seed — fine as long as the seed hasn't been consumed elsewhere.
5. The Space URL (e.g. `https://<user>-<space>.hf.space`) becomes the frontend's
   `NEXT_PUBLIC_BACKEND_URL`.

## Verified (localhost)

- `GET /api/health` -> 200, lists the 4 pod tables (backend reaches Lemma).
- `POST /api/auth/signup` -> user written to Firestore `app_users/` with a bcrypt
  (`$2b$`) hash, session JWT returned. `POST /api/auth/login` -> JWT.
- `GET /api/me` with the JWT -> username; without it -> 401; wrong password -> 401.
- `POST /api/applications/parse-jd` with the JWT -> created an `applications`
  row, `jd-parser-agent` returned structured skills, `apply_jd_parse` persisted
  them, HTTP 200 with the parsed fields. Token auto-refresh + persist exercised.
- Nothing pending — the full username/password -> Lemma chain works with no
  Firebase console changes.
