#input_type_name: ApplyMessageDraftInput
#output_type_name: ApplyMessageDraftResult
#function_name: apply_message_draft

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyMessageDraftInput(BaseModel):
    application_id: str
    contact_id: str | None = None
    purpose: str = "follow_up"
    subject: str = ""
    body: str = ""


class ApplyMessageDraftResult(BaseModel):
    message_id: str
    action: str


async def apply_message_draft(ctx: FunctionContext, data: ApplyMessageDraftInput) -> ApplyMessageDraftResult:
    pod = Pod.from_env()
    messages = pod.table("messages")

    recipient_email = None
    if data.contact_id:
        contact = pod.table("contacts").get(data.contact_id)
        recipient_email = contact.get("email")

    existing = pod.records.list(
        "messages",
        limit=1,
        filter=[
            {"field": "application_id", "op": "eq", "value": data.application_id},
            {"field": "purpose", "op": "eq", "value": data.purpose},
            {"field": "status", "op": "eq", "value": "draft"},
        ],
    ).to_dict()["items"]

    fields = {
        "application_id": data.application_id,
        "contact_id": data.contact_id,
        "purpose": data.purpose,
        "draft_subject": data.subject,
        "draft_body": data.body,
        "status": "draft",
        "recipient_email": recipient_email,
    }

    if existing:
        message_id = existing[0]["id"]
        messages.update(message_id, fields)
        return ApplyMessageDraftResult(message_id=message_id, action="updated")

    row = messages.create(fields)
    return ApplyMessageDraftResult(message_id=row["id"], action="created")
