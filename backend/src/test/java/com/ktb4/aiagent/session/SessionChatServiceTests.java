package com.ktb4.aiagent.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionChatServiceTests {

	private MutableClock clock;
	private SessionMessageService messageService;

	@BeforeEach
	void setUp() {
		clock = new MutableClock(Instant.parse("2026-08-19T00:00:00Z"));
		InMemorySessionStore sessionStore = new InMemorySessionStore(clock);
		ArrayDeque<String> messageIds = new ArrayDeque<>(List.of("message-001", "message-002"));
		messageService = new SessionMessageService(
			sessionStore,
			new InMemorySessionMessageStore(),
			clock,
			messageIds::removeFirst
		);
		sessionStore.create("session-001", Duration.ofMinutes(30));
	}

	@Test
	void storesUserMessageCallsAiAndStoresAnswer() {
		AnalysisClient analysisClient = (requestId, sessionId, content) -> {
			assertEquals("request-001", requestId);
			assertEquals("session-001", sessionId);
			assertEquals("계약서를 확인해줘", content);
			clock.advance(Duration.ofSeconds(1));
			return new AnalysisOutcome("확인이 필요합니다.", null);
		};
		SessionChatService service = new SessionChatService(
			messageService,
			analysisClient,
			() -> "request-001"
		);

		SessionChatService.ChatExchange exchange = service.chat(
			"session-001",
			"계약서를 확인해줘"
		);

		assertEquals("request-001", exchange.requestId());
		assertEquals(null, exchange.analysis());
		assertEquals(MessageRole.USER, exchange.userMessage().role());
		assertEquals("계약서를 확인해줘", exchange.userMessage().content());
		assertEquals(MessageRole.AI, exchange.aiMessage().role());
		assertEquals("확인이 필요합니다.", exchange.aiMessage().content());
		assertEquals(
			List.of(exchange.userMessage(), exchange.aiMessage()),
			messageService.getMessages("session-001")
		);
	}

	@Test
	void keepsUserMessageWhenAiRequestFails() {
		AnalysisClient analysisClient = (requestId, sessionId, content) -> {
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		};
		SessionChatService service = new SessionChatService(
			messageService,
			analysisClient,
			() -> "request-001"
		);

		ApplicationException exception = assertThrows(
			ApplicationException.class,
			() -> service.chat("session-001", "응답 실패 질문")
		);

		assertEquals(ErrorCode.AI_REQUEST_FAILED, exception.errorCode());
		List<SessionMessage> messages = messageService.getMessages("session-001");
		assertEquals(1, messages.size());
		assertEquals(MessageRole.USER, messages.getFirst().role());
		assertEquals("응답 실패 질문", messages.getFirst().content());
	}
}
