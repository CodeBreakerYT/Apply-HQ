#input_type_name: ApplyJdParseInput
#output_type_name: ApplyJdParseResult
#function_name: apply_jd_parse

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ApplyJdParseInput(BaseModel):
    application_id: str
    skills: list[str] = []
    requirements: list[str] = []
    key_responsibilities: list[str] = []
    seniority_level: str = ""
    summary: str = ""


class ApplyJdParseResult(BaseModel):
    application_id: str
    updated: bool


async def apply_jd_parse(ctx: FunctionContext, data: ApplyJdParseInput) -> ApplyJdParseResult:
    pod = Pod.from_env()
    pod.table("applications").update(data.application_id, {
        "parsed_skills": data.skills,
        "parsed_requirements": data.requirements,
        "key_responsibilities": data.key_responsibilities,
        "seniority_level": data.seniority_level,
        "jd_summary": data.summary,
    })
    return ApplyJdParseResult(application_id=data.application_id, updated=True)
