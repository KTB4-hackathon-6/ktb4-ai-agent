package com.ktb4.aiagent.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionMessageServiceTests {

	private MutableClock clock;
	private InMemorySessionStore sessionStore;
	private SessionMessageService service;

	@BeforeEach
	void setUp() {
		clock = new MutableClock(Instant.parse("2026-08-19T00:00:00Z"));
		sessionStore = new InMemorySessionStore(clock);
		ArrayDeque<String> messageIds = new ArrayDeque<>(List.of(
			"message-001",
			"message-002",
			"message-003"
		));
		service = new SessionMessageService(
			sessionStore,
			new InMemorySessionMessageStore(),
			clock,
			messageIds::removeFirst
		);
		sessionStore.create("session-001", Duration.ofMinutes(30));
		sessionStore.create("session-002", Duration.ofMinutes(30));
	}

	@Test
	void addsAndReturnsMessagesInStoredOrder() {
		SessionMessage first = service.addUserMessage("session-001", "계약서를 확인해줘");
		clock.advance(Duration.ofSeconds(1));
		SessionMessage second = service.addAiMessage("session-001", "확인해볼게요");

		assertEquals("message-001", first.messageId());
		assertEquals(Instant.parse("2026-08-19T00:00:00Z"), first.createdAt());
		assertEquals("message-002", second.messageId());
		assertEquals(Instant.parse("2026-08-19T00:00:01Z"), second.createdAt());
		assertEquals(List.of(first, second), service.getMessages("session-001"));
	}

	@Test
	void isolatesMessagesBySession() {
		SessionMessage firstSessionMessage = service.addUserMessage(
			"session-001",
			"첫 세션 메시지"
		);
		SessionMessage secondSessionMessage = service.addAiMessage(
			"session-002",
			"두 번째 세션 메시지"
		);

		assertEquals(List.of(firstSessionMessage), service.getMessages("session-001"));
		assertEquals(List.of(secondSessionMessage), service.getMessages("session-002"));
	}

	@Test
	void rejectsAddingMessageToMissingSession() {
		ApplicationException exception = assertThrows(
			ApplicationException.class,
			() -> service.addUserMessage("missing-session", "저장하면 안 되는 메시지")
		);

		assertEquals(ErrorCode.SESSION_NOT_FOUND, exception.errorCode());
	}

	@Test
	void rejectsBlankMessageContent() {
		ApplicationException exception = assertThrows(
			ApplicationException.class,
			() -> service.addUserMessage("session-001", "   ")
		);

		assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode());
	}

	@Test
	void rejectsBlankAiMessageContent() {
		ApplicationException exception = assertThrows(
			ApplicationException.class,
			() -> service.addAiMessage("session-001", "   ")
		);

		assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode());
	}
}
