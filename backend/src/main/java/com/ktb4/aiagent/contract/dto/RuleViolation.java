package com.ktb4.aiagent.contract.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "법정 기준과 비교해 발견한 위반 또는 확인 필요 항목")
public record RuleViolation(
	@JsonProperty("rule_id") String ruleId,
	@JsonProperty("law_name") String lawName,
	String article,
	String message,
	Severity severity
) {
}
