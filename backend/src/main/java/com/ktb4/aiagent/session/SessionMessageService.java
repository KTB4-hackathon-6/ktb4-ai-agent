package com.ktb4.aiagent.session;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SessionMessageService {

	private static final int MAX_USER_MESSAGE_LENGTH = 4_000;

	private final InMemorySessionStore sessionStore;
	private final InMemorySessionMessageStore messageStore;
	private final Clock clock;
	private final Supplier<String> messageIdSupplier;

	@Autowired
	public SessionMessageService(
		InMemorySessionStore sessionStore,
		InMemorySessionMessageStore messageStore
	) {
		this(sessionStore, messageStore, Clock.systemUTC(), () -> UUID.randomUUID().toString());
	}

	SessionMessageService(
		InMemorySessionStore sessionStore,
		InMemorySessionMessageStore messageStore,
		Clock clock,
		Supplier<String> messageIdSupplier
	) {
		this.sessionStore = Objects.requireNonNull(sessionStore, "Session store must not be null");
		this.messageStore = Objects.requireNonNull(messageStore, "Message store must not be null");
		this.clock = Objects.requireNonNull(clock, "Clock must not be null");
		this.messageIdSupplier = Objects.requireNonNull(
			messageIdSupplier,
			"Message ID supplier must not be null"
		);
	}

	public SessionMessage addUserMessage(String sessionId, String content) {
		validateUserMessage(sessionId, content);
		return addMessage(sessionId, MessageRole.USER, content);
	}

	public void validateUserMessage(String sessionId, String content) {
		if (content != null && content.length() > MAX_USER_MESSAGE_LENGTH) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		if (content == null || content.isBlank()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		validateSession(sessionId);
	}

	public void validateSession(String sessionId) {
		requireActiveSession(sessionId);
	}

	public SessionMessage addAiMessage(String sessionId, String content) {
		return addMessage(sessionId, MessageRole.AI, content);
	}

	private SessionMessage addMessage(String sessionId, MessageRole role, String content) {
		if (content == null || content.isBlank()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		requireActiveSession(sessionId);
		SessionMessage message = new SessionMessage(
			messageIdSupplier.get(),
			role,
			content,
			clock.instant()
		);
		messageStore.add(sessionId, message);
		return message;
	}

	public List<SessionMessage> getMessages(String sessionId) {
		requireActiveSession(sessionId);
		return messageStore.findAll(sessionId);
	}

	private void requireActiveSession(String sessionId) {
		if (sessionId == null || sessionId.isBlank() || sessionStore.findActive(sessionId).isEmpty()) {
			throw new ApplicationException(ErrorCode.SESSION_NOT_FOUND);
		}
	}
}
