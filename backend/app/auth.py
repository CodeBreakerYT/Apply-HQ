"""Username + password auth with roles, owned by the backend.

- Passwords are bcrypt-hashed and stored in Firestore (`app_users/{username}`).
- Each user has a role: "applicant" or "admin" (recruiter).
- On success the backend issues a signed session JWT (HS256) carrying the role.
- No Firebase Auth provider, no email, no Google, no service-account key.
"""
import os
import time

import bcrypt
import jwt
from fastapi import Header, HTTPException

from . import firestore_rest

_JWT_SECRET = os.environ["SESSION_JWT_SECRET"]
_JWT_ALG = "HS256"
_SESSION_TTL_SECONDS = 7 * 24 * 3600

_USERS_COLLECTION = "app_users"
_ROLES = {"applicant", "admin"}


def _normalize_username(username: str) -> str:
    normalized = username.strip().lower()
    if not normalized or len(normalized) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if not all(c.isalnum() or c in "._-" for c in normalized):
        raise HTTPException(status_code=400, detail="Username may only contain letters, numbers, . _ -")
    return normalized


def _normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if "@" not in normalized or "." not in normalized.split("@")[-1] or len(normalized) < 5:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    return normalized


def issue_session_token(username: str, role: str) -> str:
    now = int(time.time())
    payload = {"sub": username, "role": role, "iat": now, "exp": now + _SESSION_TTL_SECONDS}
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALG)


def sign_up(username: str, password: str, role: str, email: str) -> dict:
    username = _normalize_username(username)
    email = _normalize_email(email)
    if role not in _ROLES:
        raise HTTPException(status_code=400, detail="Role must be 'applicant' or 'admin'.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if firestore_rest.get_document(_USERS_COLLECTION, username) is not None:
        raise HTTPException(status_code=409, detail="That username is already taken.")

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        firestore_rest.create_document(_USERS_COLLECTION, username, {
            "username": username,
            "password_hash": password_hash,
            "role": role,
            "email": email,
            "created_at": int(time.time()),
        })
    except FileExistsError:
        raise HTTPException(status_code=409, detail="That username is already taken.")

    return {"token": issue_session_token(username, role), "username": username, "role": role}


def sign_in(username: str, password: str) -> dict:
    username = _normalize_username(username)
    user = firestore_rest.get_document(_USERS_COLLECTION, username)
    if user is None or not bcrypt.checkpw(password.encode(), user.get("password_hash", "").encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    role = user.get("role", "applicant")
    return {"token": issue_session_token(username, role), "username": username, "role": role}


def verify_session(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization: Bearer <session-token>")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid session: {exc}") from exc
    # Tokens issued before roles existed have no 'role' claim — treat them as
    # expired so the client forces a clean re-login (avoids role mismatches).
    if claims.get("role") not in _ROLES:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again.")
    return claims


def require_admin(claims: dict) -> None:
    if claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Recruiter (admin) account required.")


def require_applicant(claims: dict) -> None:
    if claims.get("role") != "applicant":
        raise HTTPException(status_code=403, detail="Applicant account required.")
