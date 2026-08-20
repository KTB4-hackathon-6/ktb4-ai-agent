from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from ai_agent.schemas.analyze import AnalyzeError, AnalyzeStatus


class DocumentAuthoringInput(BaseModel):
    text: str | None = Field(default=None, max_length=4000)


class DocumentAuthoringRequest(BaseModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    input: DocumentAuthoringInput


class SN001Fields(BaseModel):
    workerName: str | None = None
    workerPhone: str | None = None
    workerAddress: str | None = None
    employerName: str | None = None
    employerPhone: str | None = None
    workplaceName: str | None = None
    workplaceAddress: str | None = None
    employmentStartDate: str | None = None
    employmentEndDate: str | None = None
    claimType: str | None = None
    claimPeriod: str | None = None
    claimAmount: str | None = None
    claimDetails: str | None = None
    requestedAction: str | None = None


class SN001Form(BaseModel):
    formId: Literal["SN001"] = "SN001"
    formName: str = "진정서(체불, 기타 노동법 위반)"
    fields: SN001Fields = Field(default_factory=SN001Fields)


class DocumentAuthoringResult(BaseModel):
    answer: str = Field(min_length=1)
    form: SN001Form


class DocumentAuthoringResponse(BaseModel):
    requestId: str
    sessionId: str
    status: AnalyzeStatus
    result: DocumentAuthoringResult | None
    error: AnalyzeError | None

    @model_validator(mode="after")
    def validate_result_and_error(self) -> Self:
        if self.status is AnalyzeStatus.COMPLETED and (
            self.result is None or self.error is not None
        ):
            raise ValueError("COMPLETED requires result and forbids error")
        if self.status is AnalyzeStatus.FAILED and (self.result is not None or self.error is None):
            raise ValueError("FAILED requires error and forbids result")
        return self
