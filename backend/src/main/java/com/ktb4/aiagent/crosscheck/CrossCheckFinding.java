package com.ktb4.aiagent.crosscheck;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CrossCheckFinding(
	@JsonProperty("rule_id") String ruleId,
	@JsonProperty("law_name") String lawName,
	String message,
	String severity
) { }
