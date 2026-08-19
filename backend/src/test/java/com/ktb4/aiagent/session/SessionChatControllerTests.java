package com.ktb4.aiagent.session;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.common.web.GlobalExceptionHandler;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SessionChatControllerTests {

	private MutableClock clock;
	private SessionMessageService messageService;
	private MockMvc mockMvc;

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
		AnalysisClient analysisClient = (requestId, sessionId, content) -> {
			clock.advance(Duration.ofSeconds(1));
			return "확인이 필요합니다.";
		};
		mockMvc = createMockMvc(analysisClient);
		sessionStore.create("session-001", Duration.ofMinutes(30));
	}

	private MockMvc createMockMvc(AnalysisClient analysisClient) {
		SessionChatService chatService = new SessionChatService(
			messageService,
			analysisClient,
			() -> "request-001"
		);
		return MockMvcBuilders.standaloneSetup(
			new SessionChatController(chatService),
			new SessionMessageController(messageService)
		)
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void storesUserAndAiMessagesAndReturnsThemForRecovery() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/chat")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "role": "AI",
					  "content": "계약서를 확인해줘"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data.requestId").value("request-001"))
			.andExpect(jsonPath("$.data.userMessage.messageId").value("message-001"))
			.andExpect(jsonPath("$.data.userMessage.role").value("USER"))
			.andExpect(jsonPath("$.data.userMessage.content").value("계약서를 확인해줘"))
			.andExpect(jsonPath("$.data.aiMessage.messageId").value("message-002"))
			.andExpect(jsonPath("$.data.aiMessage.role").value("AI"))
			.andExpect(jsonPath("$.data.aiMessage.content").value("확인이 필요합니다."));

		mockMvc.perform(get("/api/sessions/session-001/messages"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.messages", hasSize(2)))
			.andExpect(jsonPath("$.data.messages[0].role").value("USER"))
			.andExpect(jsonPath("$.data.messages[1].role").value("AI"));
	}

	@Test
	void returnsBadGatewayAndKeepsUserMessageWhenAiFails() throws Exception {
		mockMvc = createMockMvc((requestId, sessionId, content) -> {
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		});

		mockMvc.perform(post("/api/sessions/session-001/chat")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "응답 실패 질문"
					}
					"""))
			.andExpect(status().isBadGateway())
			.andExpect(jsonPath("$.code").value("AI_REQUEST_FAILED"))
			.andExpect(jsonPath("$.data.message").isNotEmpty());

		mockMvc.perform(get("/api/sessions/session-001/messages"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.messages", hasSize(1)))
			.andExpect(jsonPath("$.data.messages[0].role").value("USER"))
			.andExpect(jsonPath("$.data.messages[0].content").value("응답 실패 질문"));
	}

	@Test
	void rejectsBlankChatContent() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/chat")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "   "
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
			.andExpect(jsonPath("$.data.message").isNotEmpty());
	}

	@Test
	void rejectsChatForMissingSession() throws Exception {
		mockMvc.perform(post("/api/sessions/missing-session/chat")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "저장하면 안 되는 메시지"
					}
					"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("SESSION_NOT_FOUND"))
			.andExpect(jsonPath("$.data.message").isNotEmpty());
	}
}
