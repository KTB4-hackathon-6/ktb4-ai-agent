package com.ktb4.aiagent.contract.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

public enum IndustryCategory {

	MANUFACTURING("manufacturing"),
	AGRICULTURE_LIVESTOCK_FISHERY("agriculture_livestock_fishery"),
	OTHER("other");

	private final String value;

	IndustryCategory(String value) {
		this.value = value;
	}

	@JsonValue
	public String value() {
		return value;
	}

	@JsonCreator
	public static IndustryCategory fromValue(String value) {
		return Arrays.stream(values())
			.filter(category -> category.value.equals(value))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown industry: " + value));
	}
}
