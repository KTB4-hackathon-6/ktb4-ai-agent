from enum import StrEnum
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PreferredLanguage(StrEnum):
    VI = "vi"
    EN = "en"
    TH = "th"
    ID = "id"
    MN = "mn"
    KM = "km"


class AnalyzeInput(ContractModel):
    text: str = Field(max_length=4000)
    documentIds: list[str]


class DocumentPage(ContractModel):
    pageNumber: int = Field(ge=1)
    text: str


class Document(ContractModel):
    documentId: str = Field(min_length=1)
    fileName: str | None
    pages: list[DocumentPage]

    @model_validator(mode="after")
    def validate_page_numbers(self) -> Self:
        page_numbers = [page.pageNumber for page in self.pages]
        if page_numbers != sorted(set(page_numbers)):
            raise ValueError("pages must have unique ascending pageNumber values")
        return self


class CheckId(StrEnum):
    WAGE_DISCLOSURE_MISSING = "WAGE_DISCLOSURE_MISSING"
    WORKING_HOURS_DISCLOSURE_MISSING = "WORKING_HOURS_DISCLOSURE_MISSING"
    HOLIDAY_DISCLOSURE_MISSING = "HOLIDAY_DISCLOSURE_MISSING"
    PAYMENT_DATE_DISCLOSURE_MISSING = "PAYMENT_DATE_DISCLOSURE_MISSING"
    BELOW_MINIMUM_WAGE = "BELOW_MINIMUM_WAGE"
    REST_TIME_INSUFFICIENT = "REST_TIME_INSUFFICIENT"
    WEEKLY_HOLIDAY_MISSING = "WEEKLY_HOLIDAY_MISSING"
    CONTRACT_PERIOD_REVIEW = "CONTRACT_PERIOD_REVIEW"
    CONTRACT_PERIOD_EXCEEDED = "CONTRACT_PERIOD_EXCEEDED"
    IN_PERSON_PAYMENT_RISK = "IN_PERSON_PAYMENT_RISK"
    ACCOMMODATION_DEDUCTION_HIGH = "ACCOMMODATION_DEDUCTION_HIGH"


class LegalCheck(ContractModel):
    checkId: CheckId
    result: Literal["DETECTED", "REVIEW_REQUIRED"]


class AnalyzeRequest(ContractModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    preferredLanguage: PreferredLanguage
    input: AnalyzeInput
    documents: list[Document]
    legalChecks: list[LegalCheck]

    @model_validator(mode="after")
    def validate_document_ids(self) -> Self:
        input_ids = self.input.documentIds
        document_ids = [document.documentId for document in self.documents]
        if len(input_ids) != len(set(input_ids)) or len(document_ids) != len(set(document_ids)):
            raise ValueError("document IDs must be unique")
        if set(input_ids) != set(document_ids):
            raise ValueError("input.documentIds must match documents[].documentId")
        return self


class AnalyzeStatus(StrEnum):
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Finding(ContractModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    severity: Literal["INFO", "LOW", "MEDIUM", "HIGH"]
    relatedDocumentIds: list[str]


class Analysis(ContractModel):
    summary: str | None = None
    findings: list[Finding]
    nextActions: list[str]


class AnalyzeResult(ContractModel):
    answer: str = Field(min_length=1)
    analysis: Analysis | None = None


class AnalyzeError(ContractModel):
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)


class AnalyzeResponse(ContractModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    status: AnalyzeStatus
    result: AnalyzeResult | None
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
