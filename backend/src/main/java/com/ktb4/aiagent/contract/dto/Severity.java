package com.ktb4.aiagent.contract.dto;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Severity {

	WARNING("warning"),
	REVIEW("review");

	private final String value;

	Severity(String value) {
		this.value = value;
	}

	@JsonValue
	public String value() {
		return value;
	}
}
