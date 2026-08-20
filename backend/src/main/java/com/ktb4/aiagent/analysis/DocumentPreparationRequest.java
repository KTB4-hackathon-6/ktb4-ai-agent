package com.ktb4.aiagent.analysis;

import java.util.Objects;

public record DocumentPreparationRequest(
	String requestId,
	String sessionId,
	Input input
) {
	public DocumentPreparationRequest {
		requestId = requireText(requestId, "Request ID must not be blank");
		sessionId = requireText(sessionId, "Session ID must not be blank");
		input = Objects.requireNonNull(input, "Input must not be null");
	}

	public record Input(String text) {
		public Input {
			text = requireText(text, "Document request text must not be blank");
			if (text.length() > 4_000) {
				throw new IllegalArgumentException("Document request text must not exceed 4000 characters");
			}
		}
	}

	private static String requireText(String value, String message) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(message);
		}
		return value;
	}
}
