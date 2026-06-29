#input_type_name: SendRecruiterMessageInput
#output_type_name: SendRecruiterMessageResult
#function_name: send_recruiter_message

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod

GMAIL_AUTH_CONFIG = "workspace-gmail"
GMAIL_SEND_OPERATION = "GMAIL_SEND_EMAIL"


class SendRecruiterMessageInput(BaseModel):
    message_id: str
    edited_body: str | None = None


class SendRecruiterMessageResult(BaseModel):
    message_id: str
    status: str
    recipient_email: str | None = None


async def send_recruiter_message(ctx: FunctionContext, data: SendRecruiterMessageInput) -> SendRecruiterMessageResult:
    pod = Pod.from_env()
    messages = pod.table("messages")

    msg = messages.get(data.message_id)
    if msg["status"] != "approved":
        raise ValueError(f"message {data.message_id} is not approved (status={msg['status']})")

    recipient_email = msg.get("recipient_email")
    if not recipient_email and msg.get("contact_id"):
        contact = pod.table("contacts").get(msg["contact_id"])
        recipient_email = contact.get("email")

    if not recipient_email:
        messages.update(data.message_id, {"status": "failed", "error_message": "no recipient email on file"})
        return SendRecruiterMessageResult(message_id=data.message_id, status="failed", recipient_email=None)

    body = data.edited_body if data.edited_body else msg.get("draft_body", "")
    subject = msg.get("draft_subject") or "Following up"

    try:
        pod.connectors.execute(
            GMAIL_AUTH_CONFIG,
            GMAIL_SEND_OPERATION,
            {
                "recipient_email": recipient_email,
                "subject": subject,
                "body": body,
            },
        ).to_dict()["result"]
    except Exception as exc:
        messages.update(data.message_id, {"status": "failed", "error_message": str(exc)[:2000]})
        return SendRecruiterMessageResult(message_id=data.message_id, status="failed", recipient_email=recipient_email)

    from datetime import datetime, timezone
    messages.update(data.message_id, {
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "recipient_email": recipient_email,
    })

    if msg.get("contact_id"):
        pod.table("contacts").update(msg["contact_id"], {
            "last_contacted_at": datetime.now(timezone.utc).date().isoformat(),
        })

    return SendRecruiterMessageResult(message_id=data.message_id, status="sent", recipient_email=recipient_email)
