#input_type_name: ApplyResumeSuggestionsInput
#output_type_name: ApplyResumeSuggestionsResult
#function_name: apply_resume_suggestions

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyResumeSuggestionsInput(BaseModel):
    application_id: str
    suggestions: list[str] = []
    summary: str = ""


class ApplyResumeSuggestionsResult(BaseModel):
    application_id: str
    updated: bool


async def apply_resume_suggestions(ctx: FunctionContext, data: ApplyResumeSuggestionsInput) -> ApplyResumeSuggestionsResult:
    pod = Pod.from_env()
    numbered = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(data.suggestions))
    text = f"{data.summary}\n\n{numbered}" if data.summary else numbered
    pod.table("applications").update(data.application_id, {"resume_suggestions": text})
    return ApplyResumeSuggestionsResult(application_id=data.application_id, updated=True)
