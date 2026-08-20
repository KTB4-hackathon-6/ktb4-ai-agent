package com.ktb4.aiagent.payslip.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PayslipViolation(
	@JsonProperty("rule_id") String ruleId,
	@JsonProperty("law_name") String lawName,
	String article,
	String message,
	PayslipViolationSeverity severity
) {
}
