package com.ktb4.aiagent.analysis;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PreferredLanguage {
	VI("vi"),
	EN("en"),
	TH("th"),
	ID("id"),
	MN("mn"),
	KM("km"),
	KO("ko");

	private final String code;

	PreferredLanguage(String code) {
		this.code = code;
	}

	@JsonValue
	public String code() {
		return code;
	}

	@JsonCreator
	public static PreferredLanguage fromCode(String code) {
		for (PreferredLanguage language : values()) {
			if (language.code.equals(code)) {
				return language;
			}
		}
		throw new IllegalArgumentException("Unsupported preferred language: " + code);
	}
}
