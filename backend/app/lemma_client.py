import json
import os
import threading
import time
from pathlib import Path

from lemma_sdk import Pod, refresh_cli_session
from lemma_sdk.errors import LemmaAuthError, LemmaConnectionError, LemmaRateLimitError, LemmaServerError

# Refresh the access token this many ms before it actually expires.
_REFRESH_SKEW_MS = 5 * 60 * 1000

# Where to persist the (rotating) refresh token across restarts. Lemma's
# refresh tokens ROTATE on every use and a reused token is treated as theft,
# so the backend must be the single consumer and remember the latest token.
# On HuggingFace, point this at a persistent dir (e.g. /data/lemma_session.json)
# by setting LEMMA_SESSION_FILE; otherwise it lives in the container's tmp and
# the .env seed is used after a cold restart.
_SESSION_FILE = Path(os.environ.get("LEMMA_SESSION_FILE", "/tmp/lemma_session.json"))

# Free alternative to HF persistent storage: if HF_TOKEN (a write-scoped token
# for this Space) is set, rewrite the LEMMA_REFRESH_TOKEN *secret* itself via
# the Hub API on every rotation. Secrets live at the Hub level, not on the
# container's disk, so they survive restarts without paid storage. SPACE_ID
# is injected automatically by the HF Spaces runtime.
_HF_TOKEN = os.environ.get("HF_TOKEN", "")
_HF_SPACE_ID = os.environ.get("SPACE_ID", "")


class _TokenManager:
    """Holds the Lemma session in memory, keeps the access token fresh, and
    persists the rotating refresh token so a single deployed backend survives
    restarts without re-seeding."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._base_url = os.environ["LEMMA_BASE_URL"]
        self._org_id = os.environ["LEMMA_ORG_ID"]
        self._pod_id = os.environ["LEMMA_POD_ID"]
        self._refresh_token = self._load_seed_refresh_token()
        self._access_token = ""
        self._expires_at_ms = 0
        self._pod: Pod | None = None

    def _load_seed_refresh_token(self) -> str:
        # Prefer a persisted (rotated) token over the static env seed.
        try:
            if _SESSION_FILE.exists():
                stored = json.loads(_SESSION_FILE.read_text())
                if stored.get("refresh_token"):
                    return stored["refresh_token"]
        except Exception:
            pass
        return os.environ["LEMMA_REFRESH_TOKEN"]

    def _persist(self) -> None:
        try:
            _SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
            _SESSION_FILE.write_text(json.dumps({"refresh_token": self._refresh_token}))
        except Exception:
            # Persistence is best-effort; in-memory state still works for this run.
            pass
        self._persist_remote_secret()

    def _persist_remote_secret(self) -> None:
        # Best-effort; skipped entirely outside a Space with HF_TOKEN configured
        # (e.g. local dev), so a missing/invalid token here never breaks a refresh.
        if not (_HF_TOKEN and _HF_SPACE_ID):
            return
        try:
            from huggingface_hub import HfApi

            HfApi(token=_HF_TOKEN).add_space_secret(
                repo_id=_HF_SPACE_ID,
                key="LEMMA_REFRESH_TOKEN",
                value=self._refresh_token,
            )
        except Exception:
            pass

    def _refresh_locked(self) -> None:
        session = refresh_cli_session(
            base_url=self._base_url,
            refresh_token=self._refresh_token,
            verify_ssl=True,
            timeout=30,
        )
        self._access_token = session["access_token"]
        self._refresh_token = session["refresh_token"]
        self._expires_at_ms = int(session["access_token_expires_at"])
        self._pod = Pod(
            self._pod_id,
            org_id=self._org_id,
            base_url=self._base_url,
            token=self._access_token,
            timeout=120,  # agents/functions can take tens of seconds (cold starts)
        )
        self._persist()

    def get_pod(self) -> Pod:
        with self._lock:
            now_ms = int(time.time() * 1000)
            if self._pod is None or now_ms >= (self._expires_at_ms - _REFRESH_SKEW_MS):
                self._refresh_locked()
            return self._pod

    def force_refresh(self) -> Pod:
        with self._lock:
            self._refresh_locked()
            return self._pod


_manager = _TokenManager()


def get_pod() -> Pod:
    return _manager.get_pod()


_TRANSIENT_RETRIES = 3
_TRANSIENT_BACKOFF_SECONDS = 1.5


def _with_auth_retry(fn):
    """Run a Lemma SDK call, refreshing the session once on auth failure and
    retrying a few times (with backoff) on transient connection/server errors
    — these are common blips, not real failures, and shouldn't surface as a
    500 to the user on the first hiccup."""
    pod = get_pod()
    for attempt in range(_TRANSIENT_RETRIES + 1):
        try:
            return fn(pod)
        except LemmaAuthError:
            pod = _manager.force_refresh()
        except (LemmaConnectionError, LemmaServerError, LemmaRateLimitError):
            if attempt == _TRANSIENT_RETRIES:
                raise
            time.sleep(_TRANSIENT_BACKOFF_SECONDS * (attempt + 1))


import re

_ARTIFACT_RE = re.compile(r"</?item>")


def _clean(value):
    """Strip stray XML-ish tokens (e.g. </item>) the agent runtime sometimes emits."""
    if isinstance(value, str):
        return _ARTIFACT_RE.sub("", value).strip()
    if isinstance(value, list):
        return [_clean(v) for v in value]
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    return value


def run_agent_and_wait(agent_name: str, message: str, *, timeout_seconds: float = 120, poll_interval: float = 2.0) -> dict:
    conversation = _with_auth_retry(lambda pod: pod.agents.run(agent_name, message))
    conversation_id = str(conversation.id)

    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        convo = _with_auth_retry(lambda pod: pod.conversations.get(conversation_id))
        if convo.status == "COMPLETED":
            return _clean(convo.output or {})
        if convo.status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"agent {agent_name} run {convo.status}: {convo.last_run_error}")
        time.sleep(poll_interval)

    raise TimeoutError(f"agent {agent_name} did not complete within {timeout_seconds}s (conversation {conversation_id})")


def start_conversation(agent_name: str) -> str:
    convo = _with_auth_retry(lambda pod: pod.conversations.create_for_agent(agent_name))
    return str(convo.id)


def send_and_get_reply(conversation_id: str, text: str, *, timeout_seconds: float = 120, poll_interval: float = 1.5) -> str:
    """Send a message to a conversation, wait for the agent's run to finish,
    and return its latest text reply."""
    _with_auth_retry(lambda pod: pod.conversations.send(conversation_id, text))

    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        convo = _with_auth_retry(lambda pod: pod.conversations.get(conversation_id))
        status = getattr(convo, "last_run_status", None)
        if status == "COMPLETED":
            break
        if status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"interview run {status}: {getattr(convo, 'last_run_error', '')}")
        time.sleep(poll_interval)

    msgs = _with_auth_retry(lambda pod: pod.conversations.messages(conversation_id)).to_dict().get("items", [])
    for m in reversed(msgs):
        if m.get("role") == "assistant" and m.get("kind") == "TEXT" and m.get("text"):
            return _clean(m["text"])
    return ""


def conversation_transcript(conversation_id: str) -> list[dict]:
    msgs = _with_auth_retry(lambda pod: pod.conversations.messages(conversation_id)).to_dict().get("items", [])
    out = []
    for m in msgs:
        if m.get("kind") == "TEXT" and m.get("text") and m.get("role") in ("user", "assistant"):
            out.append({"role": m["role"], "text": _clean(m["text"])})
    return out


def create_record(table: str, data: dict) -> dict:
    return _with_auth_retry(lambda pod: pod.records.create(table, data))


def get_record(table: str, record_id: str) -> dict:
    return _with_auth_retry(lambda pod: pod.records.get(table, record_id))


def update_record(table: str, record_id: str, data: dict) -> dict:
    return _with_auth_retry(lambda pod: pod.records.update(table, record_id, data))


def delete_record(table: str, record_id: str) -> None:
    _with_auth_retry(lambda pod: pod.records.delete(table, record_id))


def run_function(name: str, data: dict) -> object:
    return _with_auth_retry(lambda pod: pod.functions.run(name, data))


def list_records(table: str, *, limit: int = 50, filter: list | None = None, sort: list | None = None) -> list[dict]:
    resp = _with_auth_retry(lambda pod: pod.records.list(table, limit=limit, filter=filter, sort=sort))
    return resp.to_dict().get("items", [])


def write_file_text(path: str, content: str) -> None:
    _with_auth_retry(lambda pod: pod.files.write_text(path, content))


def upload_file_bytes(directory_path: str, filename: str, data: bytes) -> str:
    """Upload raw bytes to a pod file; returns the stored path."""
    import io

    full_path = f"{directory_path.rstrip('/')}/{filename}"

    def op(pod):
        pod.files.upload_file(
            io.BytesIO(data),
            path=full_path,
            filename=filename,
            directory_path=directory_path,
            search_enabled=False,
        )
        return full_path

    return _with_auth_retry(op)


def download_file_bytes(path: str) -> bytes:
    return _with_auth_retry(lambda pod: pod.files.download(path))


def delete_file(path: str) -> None:
    try:
        _with_auth_retry(lambda pod: pod.files.delete(path))
    except Exception:
        pass  # best-effort cleanup


def extract_resume_text(filename: str, data: bytes, *, timeout_seconds: float = 60) -> str:
    """Extract plain text from an uploaded resume, then delete the file.

    - .txt/.md: decoded directly (no upload).
    - .pdf/.docx/etc: uploaded to Lemma, which auto-converts to markdown; we
      poll until processing completes, read the converted markdown, then delete
      the file so nothing lingers.
    """
    import io
    import time as _time

    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext in ("txt", "md", "markdown", "text", ""):
        return data.decode("utf-8", errors="ignore")

    safe_name = filename.replace("/", "_").replace("\\", "_")
    directory = "/me/resume_uploads"
    path = f"{directory}/{safe_name}"

    # The datastore dedupes on (directory_path, filename) regardless of the
    # `path` we pass, so re-uploading the same filename 409s unless we clear
    # out whatever's there first (e.g. a prior run that errored before its own
    # cleanup below ran).
    delete_file(path)

    def _upload(pod):
        pod.files.upload_file(
            io.BytesIO(data), path=path, filename=safe_name,
            directory_path=directory, search_enabled=True,
        )
    _with_auth_retry(_upload)

    deadline = _time.monotonic() + timeout_seconds
    text = ""
    while _time.monotonic() < deadline:
        detail = _with_auth_retry(lambda pod: pod.files.get(path))
        status = getattr(detail, "status", "")
        if status == "COMPLETED":
            try:
                text = _with_auth_retry(lambda pod: pod.files.download_markdown(path)).decode("utf-8", errors="ignore")
            except Exception:
                text = ""
            break
        if status == "FAILED":
            break
        _time.sleep(2)

    if not text:
        # Fallback: best-effort raw decode (e.g. a plain-text file with odd extension).
        text = data.decode("utf-8", errors="ignore")

    delete_file(path)
    return text.strip()


def list_tables():
    return _with_auth_retry(lambda pod: pod.tables.list())
