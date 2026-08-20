from enum import StrEnum
from typing import Self

from pydantic import Field, model_validator

from ai_agent.schemas.analyze import (
    AnalyzeError,
    AnalyzeStatus,
    ContractModel,
    PreferredLanguage,
)


class GuidanceInput(ContractModel):
    text: str = Field(max_length=4000)


class GuidanceRequest(ContractModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    preferredLanguage: PreferredLanguage
    input: GuidanceInput


class AgencyCode(StrEnum):
    MOEL = "MOEL"


class SubmissionChannel(StrEnum):
    ONLINE = "ONLINE"
    VISIT = "VISIT"
    MAIL = "MAIL"


class SubmissionOption(ContractModel):
    channel: SubmissionChannel
    label: str = Field(min_length=1)
    url: str | None
    address: str | None
    instructions: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_destination(self) -> Self:
        if self.channel is SubmissionChannel.ONLINE and not self.url:
            raise ValueError("ONLINE submission requires url")
        if self.channel in {SubmissionChannel.VISIT, SubmissionChannel.MAIL} and not self.address:
            raise ValueError("VISIT and MAIL submissions require address")
        return self


class GuidanceResult(ContractModel):
    answer: str = Field(min_length=1)
    agencyCode: AgencyCode
    agencyName: str = Field(min_length=1)
    jurisdictionOfficeName: str = Field(min_length=1)
    submissionOptions: list[SubmissionOption] = Field(min_length=1)
    requiredAttachments: list[str]
    steps: list[str] = Field(min_length=1)
    notes: str | None


class GuidanceResponse(ContractModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    status: AnalyzeStatus
    result: GuidanceResult | None
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
