# job-application-command-centre

AI command centre for students/recent grads tracking job applications across
portals, referrals, email, and LinkedIn. Parses job descriptions, suggests
resume edits, drafts recruiter outreach, and prepares interview notes.
**Backend only** — no app/UI yet.

Pod id: `019f0380-369c-7563-a83f-0f8196b7a1d5` (org `PhoenixDev's Space`).

## Architecture

| Layer | Resource | Purpose |
| --- | --- | --- |
| Table | `applications` | One row per job/internship application — JD text, parsed fields, resume link/suggestions, status lifecycle |
| Table | `contacts` | Recruiters/referrals/hiring managers |
| Table | `interviews` | Interview rounds per application, prep notes |
| Table | `messages` | Drafted recruiter outreach, draft → approved → sent |
| Agent | `jd-parser-agent` | Reads `job_description`, returns structured skills/requirements/seniority/summary. **Read-only.** |
| Agent | `resume-advisor-agent` | Reads parsed JD + resume file (`/me/resumes/...`), returns resume edit suggestions. **Read-only.** |
| Agent | `recruiter-message-agent` | Drafts an outreach email for one application/contact/purpose. **Read-only.** |
| Agent | `interview-prep-agent` | Researches the company (web search) + JD, returns prep notes + likely questions. **Read-only.** |
| Function | `apply_jd_parse` | Persists `jd-parser-agent`'s output onto `applications` |
| Function | `apply_resume_suggestions` | Persists `resume-advisor-agent`'s output onto `applications` |
| Function | `apply_message_draft` | Persists `recruiter-message-agent`'s output as a `messages` draft row (resolves contact email, upserts to avoid duplicates) |
| Function | `apply_interview_prep` | Persists `interview-prep-agent`'s output onto `interviews` |
| Function | `send_recruiter_message` | Sends an **approved** message via Gmail, marks it `sent`, updates the contact's `last_contacted_at` |
| Workflow | `approve-and-send-message` | FORM (you review/approve) → DECISION → FUNCTION `send_recruiter_message` → END. Nothing emails a recruiter without this human approval gate. |

### Why agents are read-only + functions persist

The platform's default agent runtime has a tool-calling bug where the model's
write-tool calls with nested array/object arguments (e.g. `parsed_skills: [...]`)
get marshaled as an empty payload — confirmed by repeated `MISSING data`
errors in agent runs even though the same agent's structured `output_schema`
JSON comes back perfectly via `final_result`. The fix: agents only read and
return `output_schema` JSON; a small deterministic function (called via the
plain JSON API, not the agent tool-loop) persists that JSON to the table. This
also matches Lemma's own "agent judges, function persists" pattern.

## Build loop

```bash
lemma pods import ./job-application-command-centre --dry-run
lemma pods import ./job-application-command-centre
```

## Non-bundled setup

### Gmail connector (required before `send_recruiter_message` / the approval workflow can actually send)

```bash
lemma connectors auth-configs create gmail --name workspace-gmail   # or --provider COMPOSIO
lemma connectors connect-requests create gmail --auth-config-id <id>
```

**Known issue (as of this build):** the CLI's `connect-requests create` command
crashes with `TypeError: sync_detailed() takes 1 positional argument but 2 were
given` — a packaging bug where the generated SDK wrapper passes the connector
id as a URL path argument instead of inside the JSON body. Work around it by
calling the API directly:

```python
import json, os, httpx
cfg = json.load(open(os.path.expanduser(r"~\.lemma\config.json")))
server = cfg["servers"][cfg["active_server"]]
resp = httpx.post(
    f"{server['base_url']}/organizations/{server['defaults']['org_id']}/connectors/connect-requests",
    headers={"Authorization": f"Bearer {server['token']}", "Content-Type": "application/json"},
    json={"connector_id": "gmail", "auth_config_id": "<auth-config-id>"},
)
print(resp.json()["authorization_url"])
```

Open the printed `authorization_url` and complete Google sign-in. We also hit
a `Google: "Access blocked: This app's request is invalid"` error with the
default `LEMMA` provider's OAuth client (a redirect_uri misconfiguration on
Lemma's hosted app) — switching the auth config to `--provider COMPOSIO` got
past that and produces a `backend.composio.dev` link instead. **Gmail is not
yet connected in this pod** — `send_recruiter_message` will fail at the
connector-execute step (account-resolution error) until an account is
connected. Confirm with `lemma connectors overview` (Accounts column should
show 1, not "(none)").

### Resume file

Agents read the resume from a `FILE_PATH` column (`applications.resume_file`),
pointing at the user's personal files:

```bash
lemma files upload ./resume.pdf /me/resumes/resume.pdf
lemma records update applications <id> --data '{"resume_file":"/me/resumes/resume.pdf"}'
```

On Windows + Git Bash, paths starting with `/` get mangled by MSYS path
translation — prefix the command with `MSYS_NO_PATHCONV=1` or use `//me/...`.

## Test plan (what was verified during this build)

All run against the live Lemma Cloud pod with one seeded `applications` row
(ExampleCorp / Software Engineer Intern), one `contacts` row (Priya Sharma),
and one `interviews` row (Technical Phone Screen).

1. **Tables** — `lemma records create/get/update` on all four tables; FK
   columns and ENUM defaults confirmed. ✅
2. **jd-parser-agent → apply_jd_parse** — ran the agent, captured its
   `output_schema` JSON via `lemma conversations get <id>`, fed it to
   `apply_jd_parse`, confirmed `parsed_skills`/`parsed_requirements`/
   `key_responsibilities`/`seniority_level`/`jd_summary` landed on the row. ✅
3. **resume-advisor-agent → apply_resume_suggestions** — uploaded a sample
   resume to `/me/resumes/resume.txt`, linked it via `resume_file`, ran the
   agent (it read the JD + resume and returned 8 concrete suggestions),
   persisted via the function, confirmed `resume_suggestions` landed. ✅
4. **recruiter-message-agent → apply_message_draft** — drafted a `follow_up`
   message for the seeded application/contact, persisted it; the function
   correctly resolved the contact's email onto `recipient_email` and created
   one `messages` row with `status="draft"`. ✅
5. **interview-prep-agent → apply_interview_prep** — moved the application to
   `interviewing`, created an interview round, ran the agent (it used
   `WEB_SEARCH`, correctly flagged the seed company name as a placeholder
   instead of inventing facts), persisted `prep_notes`/`likely_questions`. ✅
6. **approve-and-send-message workflow, rejection branch** —
   `lemma workflows run approve-and-send-message --data '{"message_id":"...","approved":false}'`
   → `COMPLETED`, routed straight to `end` via the default DECISION edge,
   message row left untouched. ✅
7. **approve-and-send-message workflow, approval branch** — **not run**
   (Gmail isn't connected yet; running it would attempt a real send). Once an
   account is connected, run:
   `lemma workflows run approve-and-send-message --data '{"message_id":"<draft-id>","approved":true}'`
   and confirm the `messages` row flips to `status="sent"` with `sent_at` set,
   and the linked contact's `last_contacted_at` updates.

## Smoke test (copy-paste, after Gmail is connected)

```bash
# seed
lemma records create contacts --data '{"name":"Priya Sharma","email":"priya@example.com","company":"Acme","relationship":"recruiter"}'
lemma records create applications --data '{"company":"Acme","role_title":"SWE Intern","job_description":"<paste a real JD>"}'

# parse JD (agent -> capture JSON -> function)
lemma agents run jd-parser-agent "Parse the job description for application_id <id>."
lemma conversations get <conversation_id>   # copy the `output` object
lemma functions run apply_jd_parse --data '<that output object, with application_id>'

# draft + approve + send a recruiter message
lemma agents run recruiter-message-agent "Draft a follow_up message for application_id <id>, contact_id <id>."
lemma functions run apply_message_draft --data '<agent output>'
lemma workflows run approve-and-send-message --data '{"message_id":"<id>","approved":true}'
lemma records get messages <id>   # status should be "sent"
```
