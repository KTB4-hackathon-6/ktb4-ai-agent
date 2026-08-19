package com.ktb4.aiagent.session;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;

@Component
public class InMemorySessionMessageStore {

	private final ConcurrentMap<String, CopyOnWriteArrayList<SessionMessage>> messagesBySession =
		new ConcurrentHashMap<>();

	public void add(String sessionId, SessionMessage message) {
		if (sessionId == null || sessionId.isBlank()) {
			throw new IllegalArgumentException("Session ID must not be blank");
		}
		Objects.requireNonNull(message, "Session message must not be null");
		messagesBySession.computeIfAbsent(sessionId, ignored -> new CopyOnWriteArrayList<>())
			.add(message);
	}

	public List<SessionMessage> findAll(String sessionId) {
		if (sessionId == null || sessionId.isBlank()) {
			return List.of();
		}
		List<SessionMessage> messages = messagesBySession.get(sessionId);
		return messages == null ? List.of() : List.copyOf(messages);
	}
}
