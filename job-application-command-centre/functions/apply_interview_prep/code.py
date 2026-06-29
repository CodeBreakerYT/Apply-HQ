#input_type_name: ApplyInterviewPrepInput
#output_type_name: ApplyInterviewPrepResult
#function_name: apply_interview_prep

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyInterviewPrepInput(BaseModel):
    interview_id: str
    prep_notes: str = ""
    likely_questions: list[str] = []


class ApplyInterviewPrepResult(BaseModel):
    interview_id: str
    updated: bool


async def apply_interview_prep(ctx: FunctionContext, data: ApplyInterviewPrepInput) -> ApplyInterviewPrepResult:
    pod = Pod.from_env()
    pod.table("interviews").update(data.interview_id, {
        "prep_notes": data.prep_notes,
        "likely_questions": data.likely_questions,
    })
    return ApplyInterviewPrepResult(interview_id=data.interview_id, updated=True)
