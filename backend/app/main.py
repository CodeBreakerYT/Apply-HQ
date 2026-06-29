import base64
import os
import time

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import firestore_rest as fs
from .auth import require_admin, require_applicant, sign_in, sign_up, verify_session
from .lemma_client import (
    conversation_transcript,
    create_record,
    delete_file,
    delete_record,
    download_file_bytes,
    extract_resume_text,
    get_record,
    list_records,
    list_tables,
    run_agent_and_wait,
    run_function,
    send_and_get_reply,
    start_conversation,
    update_record,
    upload_file_bytes,
    write_file_text,
)

app = FastAPI(title="Job Application Command Centre API")

_origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["*"], allow_headers=["*"])

MAX_FILE_BYTES = 1024 * 1024  # 1 MB


# ============================ helpers ============================

def _sorted_desc(rows: list[dict]) -> list[dict]:
    return sorted(rows, key=lambda r: r.get("created_at", 0), reverse=True)


def _get_job(job_id: str) -> dict:
    job = fs.get_document("jobs", job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _app_access(app_id: str, claims: dict) -> tuple[dict, dict]:
    """Return (job_app, job) if the caller is the applicant or the job's recruiter."""
    job_app = fs.get_document("job_apps", app_id)
    if not job_app:
        raise HTTPException(status_code=404, detail="Application not found")
    job = _get_job(job_app["job_id"])
    user = claims["sub"]
    if user not in (job_app.get("applicant"), job.get("recruiter")):
        raise HTTPException(status_code=403, detail="Not your application")
    return job_app, job


# ============================ health ============================

@app.get("/api/health")
def health():
    tables = list_tables()
    return {"ok": True, "tables": [t.name for t in tables.items]}


# ============================ auth ============================

class Credentials(BaseModel):
    username: str
    password: str
    role: str = "applicant"


class SignupCredentials(Credentials):
    email: str


@app.post("/api/auth/signup")
def signup(body: SignupCredentials):
    return sign_up(body.username, body.password, body.role, body.email)


@app.post("/api/auth/login")
def login(body: Credentials):
    return sign_in(body.username, body.password)


@app.get("/api/me")
def me(claims: dict = Depends(verify_session)):
    return {"username": claims["sub"], "role": claims.get("role", "applicant")}


# ============================ resume profile (upload + extract) ============================

MAX_RESUME_BYTES = 4 * 1024 * 1024  # 4 MB upload cap


@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...), claims: dict = Depends(verify_session)):
    require_applicant(claims)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(raw) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="Resume file exceeds 4 MB.")

    # Extract text via Lemma's document conversion, then the file is deleted.
    text = extract_resume_text(file.filename or "resume", raw)
    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not read any text from that file. Try a PDF, DOCX, or TXT.")

    # The resume-parser agent turns the text into structured profile fields.
    parsed = run_agent_and_wait(
        "resume-parser-agent",
        f"Extract structured info from this resume text:\n\n{text[:12000]}",
    )

    profile = {
        "username": claims["sub"],
        "text": text[:12000],
        "name": parsed.get("name", ""),
        "email": parsed.get("email", ""),
        "phone": parsed.get("phone", ""),
        "headline": parsed.get("headline", ""),
        "skills": parsed.get("skills", []),
        "education": parsed.get("education", []),
        "experience": parsed.get("experience", []),
        "summary": parsed.get("summary", ""),
        "source_filename": file.filename or "resume",
        "updated_at": int(time.time()),
    }
    # Upsert the per-user resume profile in Firestore.
    if fs.get_document("resumes", claims["sub"]):
        fs.update_document("resumes", claims["sub"], profile)
    else:
        fs.create_document("resumes", claims["sub"], profile)

    return {k: v for k, v in profile.items() if k != "text"}


@app.get("/api/resume")
def get_resume(claims: dict = Depends(verify_session)):
    require_applicant(claims)
    profile = fs.get_document("resumes", claims["sub"])
    if not profile:
        return {"exists": False}
    profile["exists"] = True
    profile.pop("text", None)
    return profile


# ============================ jobs (public board + recruiter) ============================

_LOCATION_TYPES = {"remote", "onsite", "hybrid"}


class CreateJob(BaseModel):
    company: str
    role_title: str
    location: str = ""
    location_type: str = "remote"
    description: str
    tags: list[str] = []


@app.get("/api/jobs")
def list_jobs():
    """Public job board."""
    jobs = _sorted_desc(fs.list_collection("jobs"))
    for j in jobs:
        j.pop("lemma_app_id", None)
    return {"items": jobs}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = _get_job(job_id)
    job.pop("lemma_app_id", None)
    return job


@app.post("/api/jobs")
def create_job(body: CreateJob, claims: dict = Depends(verify_session)):
    require_admin(claims)
    if body.location_type not in _LOCATION_TYPES:
        raise HTTPException(status_code=400, detail="location_type must be remote, onsite, or hybrid.")
    tags = sorted({t.strip().lower() for t in body.tags if t.strip()})

    lemma_row = create_record("applications", {
        "owner_username": claims["sub"],
        "company": body.company,
        "role_title": body.role_title,
        "job_description": body.description,
        "source": "portal",
    })
    job_id = fs.new_id()
    job = fs.create_document("jobs", job_id, {
        "recruiter": claims["sub"],
        "company": body.company,
        "role_title": body.role_title,
        "location": body.location,
        "location_type": body.location_type,
        "description": body.description,
        "tags": tags,
        "status": "open",
        "parsed_skills": [],
        "lemma_app_id": lemma_row["id"],
        "created_at": int(time.time()),
    })
    job.pop("lemma_app_id", None)
    return job


@app.post("/api/jobs/{job_id}/parse-skills")
def parse_job_skills(job_id: str, claims: dict = Depends(verify_session)):
    require_admin(claims)
    job = _get_job(job_id)
    if job["recruiter"] != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your job")
    lemma_id = job["lemma_app_id"]
    parsed = run_agent_and_wait("jd-parser-agent", f"Parse the job description for application_id {lemma_id}.")
    run_function("apply_jd_parse", {
        "application_id": lemma_id,
        "skills": parsed.get("skills", []),
        "requirements": parsed.get("requirements", []),
        "key_responsibilities": parsed.get("key_responsibilities", []),
        "seniority_level": parsed.get("seniority_level", ""),
        "summary": parsed.get("summary", ""),
    })
    fs.update_document("jobs", job_id, {
        "parsed_skills": parsed.get("skills", []),
        "parsed_requirements": parsed.get("requirements", []),
        "seniority_level": parsed.get("seniority_level", ""),
        "jd_summary": parsed.get("summary", ""),
    })
    return {"job_id": job_id, "parsed": parsed}


class UpdateJob(BaseModel):
    company: str
    role_title: str
    location: str = ""
    location_type: str = "remote"
    description: str
    tags: list[str] = []


@app.patch("/api/jobs/{job_id}")
def update_job(job_id: str, body: UpdateJob, claims: dict = Depends(verify_session)):
    require_admin(claims)
    job = _get_job(job_id)
    if job["recruiter"] != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your job")
    if body.location_type not in _LOCATION_TYPES:
        raise HTTPException(status_code=400, detail="location_type must be remote, onsite, or hybrid.")
    tags = sorted({t.strip().lower() for t in body.tags if t.strip()})

    update_record("applications", job["lemma_app_id"], {
        "company": body.company,
        "role_title": body.role_title,
        "job_description": body.description,
    })
    updated = fs.update_document("jobs", job_id, {
        "company": body.company,
        "role_title": body.role_title,
        "location": body.location,
        "location_type": body.location_type,
        "description": body.description,
        "tags": tags,
    })
    updated.pop("lemma_app_id", None)
    return updated


def _cascade_delete_application(app_id: str, lemma_app_id: str | None) -> None:
    for m in fs.query("messages", "app_id", app_id):
        fs.delete_document("messages", m["id"])
    for t in fs.query("tasks", "app_id", app_id):
        fs.delete_document("tasks", t["id"])
    for p in fs.query("interview_preps", "app_id", app_id):
        fs.delete_document("interview_preps", p["id"])
    for s in fs.query("interview_sessions", "app_id", app_id):
        fs.delete_document("interview_sessions", s["id"])
    fs.delete_document("job_apps", app_id)

    if not lemma_app_id:
        return
    try:
        for row in list_records("interviews", limit=200):
            if row.get("application_id") == lemma_app_id:
                delete_record("interviews", row["id"])
    except Exception:
        pass
    try:
        d = get_record("applications", lemma_app_id)
        if d.get("resume_file"):
            delete_file(d["resume_file"])
    except Exception:
        pass
    try:
        delete_record("applications", lemma_app_id)
    except Exception:
        pass


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str, claims: dict = Depends(verify_session)):
    require_admin(claims)
    job = _get_job(job_id)
    if job["recruiter"] != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your job")

    for a in fs.query("job_apps", "job_id", job_id):
        _cascade_delete_application(a["id"], a.get("lemma_app_id"))

    fs.delete_document("jobs", job_id)
    lemma_job_id = job.get("lemma_app_id")
    if lemma_job_id:
        try:
            delete_record("applications", lemma_job_id)
        except Exception:
            pass
    return {"status": "deleted"}


@app.get("/api/my-jobs")
def my_jobs(claims: dict = Depends(verify_session)):
    require_admin(claims)
    return {"items": _sorted_desc(fs.query("jobs", "recruiter", claims["sub"]))}


def _send_via_gmail(lemma_app_id: str, recipient_email: str, purpose: str, subject: str, body: str) -> dict:
    """Draft+send a real email through the existing recruiter-message-agent pipeline
    (apply_message_draft -> send_recruiter_message -> Gmail), skipping the human
    approval step for system-generated notifications that don't need review."""
    draft = run_function("apply_message_draft", {
        "application_id": lemma_app_id,
        "purpose": purpose,
        "subject": subject,
        "body": body,
    })
    message_id = draft.output_data.to_dict()["message_id"]
    update_record("messages", message_id, {"recipient_email": recipient_email, "status": "approved"})
    result = run_function("send_recruiter_message", {"message_id": message_id})
    return result.output_data.to_dict()


# ============================ applications (applicant applies) ============================

@app.post("/api/jobs/{job_id}/apply")
def apply_to_job(job_id: str, claims: dict = Depends(verify_session)):
    require_applicant(claims)
    job = _get_job(job_id)

    # Use the applicant's stored resume profile (uploaded once, no typing).
    profile = fs.get_document("resumes", claims["sub"])
    resume_text = (profile or {}).get("text", "").strip()
    if not resume_text:
        raise HTTPException(status_code=400, detail="Upload your resume in your profile before applying.")

    existing = [a for a in fs.query("job_apps", "applicant", claims["sub"]) if a.get("job_id") == job_id]
    if existing:
        raise HTTPException(status_code=409, detail="You already applied to this job.")

    # Per-application Lemma row so resume-advisor / interview-prep agents can run.
    app_lemma = create_record("applications", {
        "owner_username": claims["sub"],
        "company": job["company"],
        "role_title": job["role_title"],
        "job_description": job["description"],
        "source": "portal",
        "status": "applied",
    })
    app_lemma_id = app_lemma["id"]
    resume_path = f"/me/resumes/{app_lemma_id}.txt"
    write_file_text(resume_path, resume_text)
    update_record("applications", app_lemma_id, {"resume_file": resume_path})

    app_id = fs.new_id()
    fs.create_document("job_apps", app_id, {
        "job_id": job_id,
        "job_title": job["role_title"],
        "company": job["company"],
        "applicant": claims["sub"],
        "recruiter": job["recruiter"],
        "status": "applied",
        "lemma_app_id": app_lemma_id,
        "resume_text": resume_text[:4000],
        "created_at": int(time.time()),
    })

    # Best-effort: notify the recruiter by email that a new candidate applied.
    # Never blocks the application itself (missing/unset recruiter email, agent
    # hiccup, or a Gmail send failure shouldn't stop the applicant from applying).
    try:
        recruiter_account = fs.get_document("app_users", job["recruiter"])
        recruiter_email = (recruiter_account or {}).get("email")
        if recruiter_email:
            draft = run_agent_and_wait(
                "recruiter-message-agent",
                f"Draft a message for application_id {app_lemma_id}, purpose 'other'. "
                f"This message is an internal notification to OUR recruiting team (not "
                f"the candidate) letting them know applicant '{claims['sub']}' just "
                f"applied for the {job['role_title']} role at {job['company']}. Address "
                f"it to the recruiting team, summarize the role, and mention they can "
                f"review the application in the dashboard.",
            )
            _send_via_gmail(
                app_lemma_id, recruiter_email, "other",
                draft.get("subject") or f"New application: {job['role_title']}",
                draft.get("body") or f"{claims['sub']} just applied for {job['role_title']} at {job['company']}.",
            )
    except Exception:
        pass

    return {"id": app_id, "status": "applied"}


@app.get("/api/my-applications")
def my_applications(claims: dict = Depends(verify_session)):
    require_applicant(claims)
    apps = _sorted_desc(fs.query("job_apps", "applicant", claims["sub"]))
    for a in apps:
        a.pop("lemma_app_id", None)
    return {"items": apps}


@app.get("/api/jobs/{job_id}/applicants")
def job_applicants(job_id: str, claims: dict = Depends(verify_session)):
    require_admin(claims)
    job = _get_job(job_id)
    if job["recruiter"] != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your job")
    apps = _sorted_desc(fs.query("job_apps", "job_id", job_id))
    for a in apps:
        a.pop("lemma_app_id", None)
    return {"items": apps}


@app.get("/api/my-applicants")
def my_applicants(claims: dict = Depends(verify_session)):
    """All applicants across every job this recruiter posted — who they're allowed to message."""
    require_admin(claims)
    apps = _sorted_desc(fs.query("job_apps", "recruiter", claims["sub"]))
    for a in apps:
        a.pop("lemma_app_id", None)
    return {"items": apps}


_APP_STATUSES = {"applied", "under_review", "accepted", "rejected"}
_DECISION_MESSAGES = {
    "accepted": "You are accepted for this role.",
    "rejected": "You have been rejected for this role.",
}


class UpdateApplicationStatus(BaseModel):
    status: str


@app.patch("/api/applications/{app_id}/status")
def update_application_status(app_id: str, body: UpdateApplicationStatus, claims: dict = Depends(verify_session)):
    """Recruiter-only: move an application to under_review / accepted / rejected.
    Accepted/rejected auto-queues a one-time decision notice for the applicant."""
    require_admin(claims)
    job_app, job = _app_access(app_id, claims)
    if job["recruiter"] != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your job")
    if body.status not in _APP_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(_APP_STATUSES)}")

    update = {"status": body.status}
    if body.status in _DECISION_MESSAGES:
        update["decision_pending"] = True
        update["decision_message"] = _DECISION_MESSAGES[body.status]
    else:
        update["decision_pending"] = False
    fs.update_document("job_apps", app_id, update)
    return {"id": app_id, "status": body.status}


@app.post("/api/applications/{app_id}/ack-decision")
def ack_decision(app_id: str, claims: dict = Depends(verify_session)):
    """Applicant-only: mark a pending accept/reject notice as seen so it shows once."""
    require_applicant(claims)
    job_app, _ = _app_access(app_id, claims)
    if job_app.get("applicant") != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your application")
    fs.update_document("job_apps", app_id, {"decision_pending": False})
    return {"id": app_id, "decision_pending": False}


@app.post("/api/applications/{app_id}/screen-resume")
def screen_resume(app_id: str, claims: dict = Depends(verify_session)):
    """Resume Screening agent: compare the applicant's resume to this job."""
    job_app, _ = _app_access(app_id, claims)
    lemma_id = job_app["lemma_app_id"]
    result = run_agent_and_wait("resume-advisor-agent", f"Suggest resume edits for application_id {lemma_id}.")
    run_function("apply_resume_suggestions", {
        "application_id": lemma_id,
        "suggestions": result.get("suggestions", []),
        "summary": result.get("summary", ""),
    })
    fs.update_document("job_apps", app_id, {
        "screening_summary": result.get("summary", ""),
        "screening_suggestions": result.get("suggestions", []),
    })
    return {"application_id": app_id, "summary": result.get("summary", ""), "suggestions": result.get("suggestions", [])}


class InterviewPrepBody(BaseModel):
    round_name: str = "Technical Phone Screen"
    format: str = "video"


@app.post("/api/applications/{app_id}/interview-prep")
def application_interview_prep(app_id: str, body: InterviewPrepBody, claims: dict = Depends(verify_session)):
    job_app, _ = _app_access(app_id, claims)
    lemma_id = job_app["lemma_app_id"]
    interview = create_record("interviews", {
        "application_id": lemma_id,
        "round_name": body.round_name,
        "format": body.format,
    })
    result = run_agent_and_wait("interview-prep-agent", f"Prepare interview notes for interview_id {interview['id']}.")
    run_function("apply_interview_prep", {
        "interview_id": interview["id"],
        "prep_notes": result.get("prep_notes", ""),
        "likely_questions": result.get("likely_questions", []),
    })

    # Persist to the applicant's interview-prep history in Firestore.
    prep_id = fs.new_id()
    record = {
        "username": claims["sub"],
        "app_id": app_id,
        "job_id": job_app["job_id"],
        "job_title": job_app["job_title"],
        "company": job_app["company"],
        "round_name": body.round_name,
        "format": body.format,
        "prep_notes": result.get("prep_notes", "")[:8000],
        "likely_questions": result.get("likely_questions", []),
        "created_at": int(time.time()),
    }
    fs.create_document("interview_preps", prep_id, record)

    return {
        "id": prep_id,
        "round_name": body.round_name,
        "prep_notes": result.get("prep_notes", ""),
        "likely_questions": result.get("likely_questions", []),
    }


@app.get("/api/interview-history")
def interview_history(claims: dict = Depends(verify_session)):
    require_applicant(claims)
    return {"items": _sorted_desc(fs.query("interview_preps", "username", claims["sub"]))}


# ============================ AI interviewer (live mock interview) ============================

INTERVIEW_DONE_TOKEN = "INTERVIEW COMPLETE"
MAX_INTERVIEW_QUESTIONS = 5


@app.post("/api/applications/{app_id}/interview/start")
def interview_start(app_id: str, claims: dict = Depends(verify_session)):
    require_applicant(claims)
    job_app, job = _app_access(app_id, claims)

    profile = fs.get_document("resumes", claims["sub"]) or {}
    background = profile.get("summary") or profile.get("text", "")[:1500]
    skills = ", ".join(profile.get("skills", []))

    conv_id = start_conversation("ai-interviewer-agent")
    seed = (
        f"Conduct a mock interview for the role: {job['role_title']} at {job['company']}.\n\n"
        f"Job description:\n{job.get('description', '')[:1500]}\n\n"
        f"Candidate background: {background}\n"
        f"Candidate skills: {skills}\n\n"
        "Begin the interview now with your intro and first question."
    )
    first = send_and_get_reply(conv_id, seed)

    fs.create_document("interview_sessions", conv_id, {
        "conversation_id": conv_id,
        "username": claims["sub"],
        "app_id": app_id,
        "job_title": job_app["job_title"],
        "company": job_app["company"],
        "status": "in_progress",
        "turns": 0,
        "created_at": int(time.time()),
    })

    return {"conversation_id": conv_id, "message": first, "done": False}


class InterviewReply(BaseModel):
    answer: str


@app.post("/api/interview/{conversation_id}/reply")
def interview_reply(conversation_id: str, body: InterviewReply, claims: dict = Depends(verify_session)):
    require_applicant(claims)
    session = fs.get_document("interview_sessions", conversation_id)
    if not session or session.get("username") != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your interview session")
    if not body.answer.strip():
        raise HTTPException(status_code=400, detail="Answer is empty.")

    turns = session.get("turns", 0) + 1
    message = body.answer
    if turns >= MAX_INTERVIEW_QUESTIONS:
        # Reinforce the agent's own instructions (5 questions then stop) so a
        # model that drifts doesn't keep the candidate answering indefinitely.
        message += (
            "\n\n[System: that was your 5th answer. Per your instructions, end the "
            "interview now — output INTERVIEW COMPLETE on its own line, then give "
            "structured feedback. Do not ask another question.]"
        )

    reply = send_and_get_reply(conversation_id, message)
    done = INTERVIEW_DONE_TOKEN in reply

    if done:
        feedback = reply.split(INTERVIEW_DONE_TOKEN, 1)[-1].strip()
        transcript = conversation_transcript(conversation_id)
        fs.update_document("interview_sessions", conversation_id, {
            "status": "complete",
            "turns": turns,
            "feedback": feedback[:8000],
            "transcript": [f"{t['role']}: {t['text']}" for t in transcript][:60],
            "completed_at": int(time.time()),
        })
    else:
        fs.update_document("interview_sessions", conversation_id, {"turns": turns})

    return {"message": reply, "done": done}


class TerminateBody(BaseModel):
    reason: str = ""


@app.post("/api/interview/{conversation_id}/terminate")
def terminate_interview(conversation_id: str, body: TerminateBody, claims: dict = Depends(verify_session)):
    require_applicant(claims)
    session = fs.get_document("interview_sessions", conversation_id)
    if not session or session.get("username") != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your interview session")
    if session.get("status") == "in_progress":
        fs.update_document("interview_sessions", conversation_id, {
            "status": "terminated",
            "termination_reason": body.reason[:500],
            "completed_at": int(time.time()),
        })
    return {"status": "terminated"}


@app.get("/api/interview-sessions")
def interview_sessions(claims: dict = Depends(verify_session)):
    require_applicant(claims)
    sessions = _sorted_desc(fs.query("interview_sessions", "username", claims["sub"]))
    return {"items": [s for s in sessions if s.get("status") == "complete"]}


@app.get("/api/interview-sessions/{conversation_id}")
def interview_session_detail(conversation_id: str, claims: dict = Depends(verify_session)):
    require_applicant(claims)
    session = fs.get_document("interview_sessions", conversation_id)
    if not session or session.get("username") != claims["sub"]:
        raise HTTPException(status_code=404, detail="Not found")
    return session


# ============================ messages ============================

class MessageBody(BaseModel):
    body: str


@app.get("/api/applications/{app_id}/messages")
def list_messages(app_id: str, claims: dict = Depends(verify_session)):
    _app_access(app_id, claims)
    return {"items": sorted(fs.query("messages", "app_id", app_id), key=lambda m: m.get("created_at", 0))}


@app.post("/api/applications/{app_id}/messages")
def send_message(app_id: str, body: MessageBody, claims: dict = Depends(verify_session)):
    _app_access(app_id, claims)
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="Message is empty.")
    return fs.create_document("messages", fs.new_id(), {
        "app_id": app_id,
        "from_user": claims["sub"],
        "from_role": claims.get("role", "applicant"),
        "body": body.body,
        "created_at": int(time.time()),
    })


@app.post("/api/applications/{app_id}/draft-message")
def draft_message(app_id: str, claims: dict = Depends(verify_session)):
    """Recruiter uses the Recruiter Message agent to draft (not send) a message."""
    require_admin(claims)
    job_app, _ = _app_access(app_id, claims)
    result = run_agent_and_wait(
        "recruiter-message-agent",
        f"Draft a follow_up message for application_id {job_app['lemma_app_id']}.",
    )
    return {"subject": result.get("subject", ""), "body": result.get("body", "")}


class SendEmailBody(BaseModel):
    subject: str
    body: str


@app.post("/api/applications/{app_id}/send-email-message")
def send_email_message(app_id: str, payload: SendEmailBody, claims: dict = Depends(verify_session)):
    """Recruiter sends a real email to the applicant (Gmail), via the same
    apply_message_draft -> send_recruiter_message pipeline the approval workflow
    uses. Recipient is the applicant's resume-extracted email (no platform email
    field exists for the applicant's own account)."""
    require_admin(claims)
    job_app, _ = _app_access(app_id, claims)
    if not payload.subject.strip() or not payload.body.strip():
        raise HTTPException(status_code=400, detail="Subject and body are required.")

    profile = fs.get_document("resumes", job_app["applicant"])
    recipient_email = (profile or {}).get("email", "").strip()
    if not recipient_email:
        raise HTTPException(
            status_code=400,
            detail="This applicant's resume doesn't have an email on file — can't send a real email.",
        )

    result = _send_via_gmail(job_app["lemma_app_id"], recipient_email, "follow_up", payload.subject, payload.body)
    if result.get("status") != "sent":
        raise HTTPException(status_code=502, detail="Gmail send failed — check the connector is still connected.")

    fs.create_document("messages", fs.new_id(), {
        "app_id": app_id,
        "from_user": claims["sub"],
        "from_role": claims.get("role", "applicant"),
        "body": f"[Sent via email to {recipient_email}] {payload.subject}\n\n{payload.body}",
        "created_at": int(time.time()),
    })
    return {"status": "sent", "recipient_email": recipient_email}


# ============================ tasks ============================

class TaskBody(BaseModel):
    title: str
    instructions: str


@app.post("/api/applications/{app_id}/tasks")
def assign_task(app_id: str, body: TaskBody, claims: dict = Depends(verify_session)):
    require_admin(claims)
    job_app, job = _app_access(app_id, claims)
    return fs.create_document("tasks", fs.new_id(), {
        "app_id": app_id,
        "recruiter": job["recruiter"],
        "applicant": job_app["applicant"],
        "title": body.title,
        "instructions": body.instructions,
        "status": "assigned",
        "created_at": int(time.time()),
    })


@app.get("/api/applications/{app_id}/tasks")
def list_tasks(app_id: str, claims: dict = Depends(verify_session)):
    _app_access(app_id, claims)
    return {"items": _sorted_desc(fs.query("tasks", "app_id", app_id))}


class SubmitTaskBody(BaseModel):
    submission_text: str = ""
    submission_url: str = ""
    file_name: str = ""
    file_base64: str = ""  # optional attachment, <= 1MB decoded


@app.post("/api/tasks/{task_id}/submit")
def submit_task(task_id: str, body: SubmitTaskBody, claims: dict = Depends(verify_session)):
    require_applicant(claims)
    task = fs.get_document("tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["applicant"] != claims["sub"]:
        raise HTTPException(status_code=403, detail="Not your task")

    file_path = ""
    if body.file_base64:
        try:
            raw = base64.b64decode(body.file_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid file encoding.")
        if len(raw) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail="Attachment exceeds 1 MB limit.")
        safe_name = (body.file_name or "submission").replace("/", "_").replace("\\", "_")
        file_path = upload_file_bytes(f"/me/submissions/{task_id}", safe_name, raw)

    fs.update_document("tasks", task_id, {
        "status": "submitted",
        "submission_text": body.submission_text,
        "submission_url": body.submission_url,
        "file_path": file_path,
        "file_name": body.file_name if file_path else "",
        "submitted_at": int(time.time()),
    })
    return {"task_id": task_id, "status": "submitted", "has_file": bool(file_path)}


@app.get("/api/tasks/{task_id}/attachment")
def get_task_attachment(task_id: str, claims: dict = Depends(verify_session)):
    task = fs.get_document("tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if claims["sub"] not in (task["applicant"], task["recruiter"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    if not task.get("file_path"):
        raise HTTPException(status_code=404, detail="No attachment")
    data = download_file_bytes(task["file_path"])
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{task.get("file_name") or "submission"}"'},
    )
