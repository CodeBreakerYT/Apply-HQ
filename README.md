# AI Job Application Command Centre

A job-application command centre for students/grads: track applications, and use
**Lemma AI agents** to parse job descriptions, suggest resume edits, draft
recruiter messages, and prep for interviews.

Three pieces:

```
frontend/   Next.js 16 app  (Firebase Auth + Firestore)        -> deploy on Netlify
backend/    FastAPI service (verifies Firebase token, calls Lemma) -> deploy on HuggingFace (Docker)
job-application-command-centre/   the Lemma pod bundle (tables, agents, functions, workflow)
```

```
Browser ──Firebase Auth (username/password)──> Firestore (user profile + app mirror)
   │
   │ Firebase ID token (Bearer)
   ▼
FastAPI backend ──(server-side Lemma token)──> Lemma pod
                                                 ├─ tables: applications, contacts, interviews, messages
                                                 ├─ agents: jd-parser, resume-advisor, recruiter-message, interview-prep
                                                 └─ functions: apply_* persisters, send_recruiter_message
```

## Auth design (username + password, backend-owned, Firebase Firestore)
- No Google/OAuth, no email. Sign-up/login take **only a username + password**.
- The **backend** owns auth: it bcrypt-hashes the password and stores the user
  in **Firestore** at `app_users/{username}` (via the Firestore REST API + Web
  API key — no service-account key). On success it issues its own signed session
  JWT, which the frontend sends as `Authorization: Bearer <token>`.
- **No Firebase console changes required.** (The Email/Password provider is *not*
  used — that's the native Firebase Auth path that needs a console toggle; we
  deliberately avoid it.) Firestore just needs to be reachable, which it is.

> Security note for production: the project's Firestore rules currently allow
> access (so the REST API works with just the Web key). Before going live, lock
> the `app_users` collection so only the backend can read it, and move the
> backend to a Firestore service account. The bcrypt hashes mean passwords are
> never stored in the clear regardless.

## Run locally

**1. Lemma pod** — already created and imported (see
`job-application-command-centre/README.md`). You just need a logged-in CLI
session (`lemma auth login`) to seed the backend tokens.

**2. Backend** (port 8000):
```bash
cd backend
cp .env.example .env     # fill from ~/.lemma/config.json + Firebase project id
uv venv .venv --python 3.12
uv pip install -r requirements.txt --python ./.venv/Scripts/python.exe
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

**3. Frontend** (port 3000):
```bash
cd frontend
cp .env.example .env.local   # fill in your Firebase web config (see Firebase console -> Project settings); backend URL defaults to localhost:8000
pnpm install
pnpm dev
```

Open http://localhost:3000 -> Sign up (username + password) -> Dashboard ->
"Parse with Lemma AI" runs the full chain and mirrors the result into Firestore.

## Deploy

- **Frontend -> Netlify**: connect the `frontend/` folder. `netlify.toml` is set
  up with the Next.js plugin. Add the `NEXT_PUBLIC_*` env vars (Firebase config +
  `NEXT_PUBLIC_BACKEND_URL` = your HuggingFace Space URL).
- **Backend -> HuggingFace Space (Docker)**: push `backend/` (with `vendor/`).
  Add the Lemma + Firebase secrets. Set `FRONTEND_ORIGIN` to your Netlify URL.
  Details + token-rotation notes in `backend/README.md`.

## Status — fully proven on localhost (no pending steps)

- ✅ Signup (username + password) -> bcrypt hash stored in Firestore
  (`app_users/{username}`) -> backend session JWT issued.
- ✅ Login with correct creds -> JWT; wrong password -> 401; no token -> 401.
- ✅ Authenticated `POST /api/applications/parse-jd` -> Lemma `applications` row
  -> `jd-parser-agent` parses -> `apply_jd_parse` persists -> structured fields
  returned (verified end to end, HTTP 200).
- ✅ Backend reaches the Lemma pod (`/api/health`).
- ✅ Lemma token auto-refresh + persistence (survives hourly expiry/restarts).
- ✅ Frontend production build passes; all routes (/, /login, /signup, /dashboard) compile.

Demo account already created during testing: username `rishav_demo`, password
`secret123` (delete it in Firestore if you don't want it).

## Secrets
All real secrets live in gitignored files: `backend/.env`, `frontend/.env.local`.
`.env.example` files document the shape. The root `.gitignore` also blocks any
`*.serviceaccount.json` and the persisted `lemma_session.json`.
