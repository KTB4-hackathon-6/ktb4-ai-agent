package com.ktb4.aiagent.session;

import java.time.Instant;
import java.util.Objects;

public record SessionMessage(
	String messageId,
	MessageRole role,
	String content,
	Instant createdAt
) {

	public SessionMessage {
		if (messageId == null || messageId.isBlank()) {
			throw new IllegalArgumentException("Message ID must not be blank");
		}
		Objects.requireNonNull(role, "Message role must not be null");
		Objects.requireNonNull(content, "Message content must not be null");
		Objects.requireNonNull(createdAt, "Message creation time must not be null");
	}
}
