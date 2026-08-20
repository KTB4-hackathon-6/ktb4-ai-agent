package com.ktb4.aiagent.analysis;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Schema(description = "FastAPI가 반환한 사용자 답변과 타입 안전한 구조화 분석 결과")
public record AnalysisOutcome(
	@Schema(description = "사용자에게 보여줄 답변") String answer,
	Analysis analysis
) {

	public AnalysisOutcome {
		answer = requireText(answer, "Answer must not be blank");
	}

	public record Analysis(
		String summary,
		List<Finding> findings,
		List<String> nextActions
	) {

		public Analysis {
			findings = immutableList(findings, "Findings must not be null");
			nextActions = immutableList(nextActions, "Next actions must not be null");
		}
	}

	public record Finding(
		String title,
		String description,
		FindingSeverity severity,
		List<String> relatedDocumentIds
	) {

		public Finding {
			title = requireText(title, "Finding title must not be blank");
			description = requireText(description, "Finding description must not be blank");
			severity = Objects.requireNonNull(severity, "Finding severity must not be null");
			relatedDocumentIds = immutableList(
				relatedDocumentIds,
				"Related document IDs must not be null"
			);
		}
	}

	public record DocumentDraft(
		DocumentDraftStatus status,
		LaborComplaintFormData data,
		List<MissingField> missingFields
	) {

		public DocumentDraft {
			status = Objects.requireNonNull(status, "Draft status must not be null");
			data = Objects.requireNonNull(data, "Draft data must not be null");
			missingFields = immutableList(missingFields, "Missing fields must not be null");
			if (status == DocumentDraftStatus.READY || status == DocumentDraftStatus.GENERATED) {
				List<String> missingRequired = data.requiredMissingFieldIds();
				if (!missingRequired.isEmpty()) {
					throw new IllegalArgumentException(
						status + " requires fields: " + String.join(", ", missingRequired)
					);
				}
				if (!missingFields.isEmpty()) {
					throw new IllegalArgumentException(status + " forbids missingFields");
				}
			}
			if (status == DocumentDraftStatus.NEEDS_INPUT && missingFields.size() != 1) {
				throw new IllegalArgumentException("NEEDS_INPUT requires exactly one missing field");
			}
		}
	}

	public record LaborComplaintFormData(
		ComplainantData complainant,
		RespondentData respondent,
		ComplaintDetailsData complaint,
		SubmissionData submission
	) {

		public LaborComplaintFormData {
			complainant = Objects.requireNonNull(complainant, "Complainant data must not be null");
			respondent = Objects.requireNonNull(respondent, "Respondent data must not be null");
			complaint = Objects.requireNonNull(complaint, "Complaint data must not be null");
			submission = Objects.requireNonNull(submission, "Submission data must not be null");
		}

		public List<String> requiredMissingFieldIds() {
			List<String> missing = new ArrayList<>();
			addIfBlank(missing, "complainant.fullName", complainant.fullName());
			addIfBlank(missing, "complainant.address", complainant.address());
			addIfBlank(missing, "complainant.mobilePhone", complainant.mobilePhone());
			addIfBlank(missing, "respondent.fullName", respondent.fullName());
			addIfNull(missing, "respondent.workplaceType", respondent.workplaceType());
			addIfBlank(missing, "respondent.workplaceName", respondent.workplaceName());
			addIfBlank(
				missing,
				"respondent.actualWorkplaceAddress",
				respondent.actualWorkplaceAddress()
			);
			addIfNull(missing, "complaint.employmentStartDate", complaint.employmentStartDate());
			addIfNull(missing, "complaint.employmentStatus", complaint.employmentStatus());
			addIfBlank(missing, "complaint.jobDescription", complaint.jobDescription());
			addIfNull(missing, "complaint.contractMethod", complaint.contractMethod());
			addIfBlank(missing, "complaint.details", complaint.details());
			return List.copyOf(missing);
		}
	}

	public record ComplainantData(
		String fullName,
		String residentRegistrationNumber,
		String address,
		String telephone,
		String mobilePhone,
		String email,
		Boolean receiveStatusUpdates,
		Boolean notifyViaLaborPortal
	) {
	}

	public record RespondentData(
		String fullName,
		String contact,
		String address,
		WorkplaceType workplaceType,
		String workplaceName,
		String actualWorkplaceAddress,
		String workplaceTelephone,
		Integer employeeCount
	) {

		public RespondentData {
			if (employeeCount != null && employeeCount < 0) {
				throw new IllegalArgumentException("Employee count must not be negative");
			}
		}
	}

	public record ComplaintDetailsData(
		LocalDate employmentStartDate,
		LocalDate employmentEndDate,
		Long unpaidWagesTotal,
		EmploymentStatus employmentStatus,
		Long unpaidSeverancePay,
		Long otherUnpaidAmount,
		String jobDescription,
		String payday,
		ContractMethod contractMethod,
		String details,
		List<String> attachmentFileNames
	) {

		public ComplaintDetailsData {
			validateNonNegative(unpaidWagesTotal, "Unpaid wages total");
			validateNonNegative(unpaidSeverancePay, "Unpaid severance pay");
			validateNonNegative(otherUnpaidAmount, "Other unpaid amount");
			attachmentFileNames = immutableList(
				attachmentFileNames,
				"Attachment file names must not be null"
			);
		}
	}

	public record SubmissionData(String recipientLaborOfficeName) {
	}

	public record MissingField(
		String fieldId,
		String displayName,
		boolean required,
		MissingFieldInputType inputType,
		String question,
		String reason,
		boolean sensitive,
		MissingFieldValidationRules validationRules,
		MissingFieldStatus status
	) {

		public MissingField {
			fieldId = requireText(fieldId, "Missing field ID must not be blank");
			displayName = requireText(displayName, "Missing field display name must not be blank");
			inputType = Objects.requireNonNull(inputType, "Missing field input type must not be null");
			question = requireText(question, "Missing field question must not be blank");
			reason = requireText(reason, "Missing field reason must not be blank");
			validationRules = Objects.requireNonNull(
				validationRules,
				"Missing field validation rules must not be null"
			);
			status = Objects.requireNonNull(status, "Missing field status must not be null");
		}
	}

	public record MissingFieldValidationRules(
		String pattern,
		Integer minLength,
		Integer maxLength,
		Long minValue,
		Long maxValue,
		List<String> allowedValues
	) {

		public MissingFieldValidationRules {
			allowedValues = immutableList(allowedValues, "Allowed values must not be null");
		}
	}

	public enum FindingSeverity {
		INFO,
		LOW,
		MEDIUM,
		HIGH
	}

	public enum DocumentDraftStatus {
		READY,
		NEEDS_INPUT,
		GENERATED,
		FAILED
	}

	public enum MissingFieldInputType {
		TEXT,
		DATE,
		PHONE,
		NUMBER,
		TEXTAREA,
		BOOLEAN,
		SELECT,
		FILE_LIST
	}

	public enum MissingFieldStatus {
		MISSING,
		PROVIDED,
		CONFIRMED
	}

	public enum WorkplaceType {
		WORKPLACE,
		CONSTRUCTION_SITE
	}

	public enum EmploymentStatus {
		RESIGNED,
		EMPLOYED
	}

	public enum ContractMethod {
		WRITTEN,
		ORAL
	}

	private static <T> List<T> immutableList(List<T> values, String message) {
		return List.copyOf(Objects.requireNonNull(values, message));
	}

	private static String requireText(String value, String message) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(message);
		}
		return value;
	}

	private static void addIfBlank(List<String> missing, String fieldId, String value) {
		if (value == null || value.isBlank()) {
			missing.add(fieldId);
		}
	}

	private static void addIfNull(List<String> missing, String fieldId, Object value) {
		if (value == null) {
			missing.add(fieldId);
		}
	}

	private static void validateNonNegative(Long value, String label) {
		if (value != null && value < 0) {
			throw new IllegalArgumentException(label + " must not be negative");
		}
	}
}
