from datetime import date
from enum import StrEnum
from typing import Self

from pydantic import Field, model_validator

from ai_agent.schemas.analyze import (
    AnalyzeError,
    AnalyzeStatus,
    ContractModel,
    PreferredLanguage,
)


class DocumentAuthoringInput(ContractModel):
    text: str = Field(max_length=4000)


class DocumentAuthoringRequest(ContractModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    preferredLanguage: PreferredLanguage
    input: DocumentAuthoringInput


class WorkplaceType(StrEnum):
    WORKPLACE = "WORKPLACE"
    CONSTRUCTION_SITE = "CONSTRUCTION_SITE"


class EmploymentStatus(StrEnum):
    RESIGNED = "RESIGNED"
    EMPLOYED = "EMPLOYED"


class ContractMethod(StrEnum):
    WRITTEN = "WRITTEN"
    ORAL = "ORAL"


class ComplainantData(ContractModel):
    fullName: str | None = Field(default=None, max_length=100)
    residentRegistrationNumber: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=300)
    telephone: str | None = Field(default=None, max_length=30)
    mobilePhone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=254)
    receiveStatusUpdates: bool | None = None
    notifyViaLaborPortal: bool | None = None


class RespondentData(ContractModel):
    fullName: str | None = Field(default=None, max_length=100)
    contact: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=300)
    workplaceType: WorkplaceType | None = None
    workplaceName: str | None = Field(default=None, max_length=200)
    actualWorkplaceAddress: str | None = Field(default=None, max_length=300)
    workplaceTelephone: str | None = Field(default=None, max_length=30)
    employeeCount: int | None = Field(default=None, ge=0)


class ComplaintDetailsData(ContractModel):
    employmentStartDate: date | None = None
    employmentEndDate: date | None = None
    unpaidWagesTotal: int | None = Field(default=None, ge=0)
    employmentStatus: EmploymentStatus | None = None
    unpaidSeverancePay: int | None = Field(default=None, ge=0)
    otherUnpaidAmount: int | None = Field(default=None, ge=0)
    jobDescription: str | None = Field(default=None, max_length=300)
    payday: str | None = Field(default=None, max_length=100)
    contractMethod: ContractMethod | None = None
    details: str | None = Field(default=None, max_length=4000)
    attachmentFileNames: list[str] = Field(default_factory=list)


class SubmissionData(ContractModel):
    recipientLaborOfficeName: str | None = Field(default=None, max_length=100)


class LaborComplaintFormData(ContractModel):
    complainant: ComplainantData = Field(default_factory=ComplainantData)
    respondent: RespondentData = Field(default_factory=RespondentData)
    complaint: ComplaintDetailsData = Field(default_factory=ComplaintDetailsData)
    submission: SubmissionData = Field(default_factory=SubmissionData)

    def required_missing_field_ids(self) -> list[str]:
        required = {
            "complainant.fullName": self.complainant.fullName,
            "complainant.address": self.complainant.address,
            "complainant.mobilePhone": self.complainant.mobilePhone,
            "respondent.fullName": self.respondent.fullName,
            "respondent.workplaceType": self.respondent.workplaceType,
            "respondent.workplaceName": self.respondent.workplaceName,
            "respondent.actualWorkplaceAddress": self.respondent.actualWorkplaceAddress,
            "complaint.employmentStartDate": self.complaint.employmentStartDate,
            "complaint.employmentStatus": self.complaint.employmentStatus,
            "complaint.jobDescription": self.complaint.jobDescription,
            "complaint.contractMethod": self.complaint.contractMethod,
            "complaint.details": self.complaint.details,
        }
        return [field_id for field_id, value in required.items() if value is None or value == ""]


class MissingFieldInputType(StrEnum):
    TEXT = "TEXT"
    DATE = "DATE"
    PHONE = "PHONE"
    NUMBER = "NUMBER"
    TEXTAREA = "TEXTAREA"
    BOOLEAN = "BOOLEAN"
    SELECT = "SELECT"
    FILE_LIST = "FILE_LIST"


class MissingFieldStatus(StrEnum):
    MISSING = "MISSING"
    PROVIDED = "PROVIDED"
    CONFIRMED = "CONFIRMED"


class MissingFieldValidationRules(ContractModel):
    pattern: str | None
    minLength: int | None
    maxLength: int | None
    minValue: int | None
    maxValue: int | None
    allowedValues: list[str]


class MissingField(ContractModel):
    fieldId: str = Field(min_length=1)
    displayName: str = Field(min_length=1)
    required: bool
    inputType: MissingFieldInputType
    question: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    sensitive: bool
    validationRules: MissingFieldValidationRules
    status: MissingFieldStatus


class DocumentDraftStatus(StrEnum):
    NEEDS_INPUT = "NEEDS_INPUT"
    READY = "READY"


class DocumentDraft(ContractModel):
    status: DocumentDraftStatus
    data: LaborComplaintFormData
    missingFields: list[MissingField]

    @model_validator(mode="after")
    def validate_status(self) -> Self:
        missing = self.data.required_missing_field_ids()
        if self.status is DocumentDraftStatus.READY and (missing or self.missingFields):
            raise ValueError("READY requires all required data and forbids missingFields")
        if self.status is DocumentDraftStatus.NEEDS_INPUT:
            if len(self.missingFields) != 1:
                raise ValueError("NEEDS_INPUT requires exactly one missing field")
            field = self.missingFields[0]
            if not field.required or field.status is not MissingFieldStatus.MISSING:
                raise ValueError("NEEDS_INPUT requires one required MISSING field")
            if field.fieldId not in missing:
                raise ValueError("missingFields must reference an empty required field")
        return self


class DocumentAuthoringResult(ContractModel):
    answer: str = Field(min_length=1)
    documentDrafts: list[DocumentDraft]

    @model_validator(mode="after")
    def validate_one_draft(self) -> Self:
        if len(self.documentDrafts) != 1:
            raise ValueError("document preparation requires exactly one draft")
        return self


class DocumentAuthoringResponse(ContractModel):
    requestId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
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
