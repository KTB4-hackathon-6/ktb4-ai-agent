package com.ktb4.aiagent.payslip.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PayslipDiagnosis(
	PayslipFacts facts,
	List<PayslipViolation> violations,
	@JsonProperty("unverified_fields") List<String> unverifiedFields
) {
	public PayslipDiagnosis {
		violations = List.copyOf(violations);
		unverifiedFields = List.copyOf(unverifiedFields);
	}
}
