from enum import StrEnum
from typing import Any, Literal, Self

from pydantic import BaseModel, Field, model_validator


class AnalyzeInput(BaseModel):
    text: str | None = Field(max_length=4000)
    documentIds: list[str]


class DocumentPage(BaseModel):
    pageNumber: int = Field(ge=1)
    text: str


class Document(BaseModel):
    documentId: str
    fileName: str | None
    pages: list[DocumentPage]


class LegalReference(BaseModel):
    lawName: str
    article: str
    paragraph: str | None
    item: str | None


class LegalCheck(BaseModel):
    checkId: str
    legalReference: LegalReference
    result: Literal["VIOLATION", "POSSIBLE_VIOLATION", "PASS", "UNKNOWN"]
    reason: str | None
    relatedDocumentIds: list[str]
    values: dict[str, Any]


class AnalyzeRequest(BaseModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    input: AnalyzeInput
    documents: list[Document]
    legalChecks: list[LegalCheck]


class AnalyzeStatus(StrEnum):
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Finding(BaseModel):
    title: str
    description: str
    severity: Literal["INFO", "LOW", "MEDIUM", "HIGH"]
    relatedCheckIds: list[str]
    relatedDocumentIds: list[str]


class Analysis(BaseModel):
    summary: str | None = None
    findings: list[Finding]
    nextActions: list[str]


class AnalyzeResult(BaseModel):
    answer: str = Field(min_length=1)
    analysis: Analysis | None = None


class AnalyzeError(BaseModel):
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)


class AnalyzeResponse(BaseModel):
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
