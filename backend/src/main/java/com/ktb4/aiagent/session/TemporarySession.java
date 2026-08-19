package com.ktb4.aiagent.session;

import java.time.Instant;
import java.util.Objects;

public record TemporarySession(String sessionId, Instant expiresAt) {

	public TemporarySession {
		if (sessionId == null || sessionId.isBlank()) {
			throw new IllegalArgumentException("Session ID must not be blank");
		}
		Objects.requireNonNull(expiresAt, "Expiration time must not be null");
	}
}
