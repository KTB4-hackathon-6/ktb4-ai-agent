package com.ktb4.aiagent.common.web;

public record ErrorData(String message) {

	public ErrorData {
		if (message == null || message.isBlank()) {
			throw new IllegalArgumentException("Error message must not be blank");
		}
	}
}
