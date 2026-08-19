package com.ktb4.aiagent.session;

import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

class SessionMessageControllerTests {

	private MutableClock clock;
	private InMemorySessionStore sessionStore;
	private SessionMessageService messageService;
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		clock = new MutableClock(Instant.parse("2026-08-19T00:00:00Z"));
		sessionStore = new InMemorySessionStore(clock);
		ArrayDeque<String> messageIds = new ArrayDeque<>(List.of("message-001", "message-002"));
		messageService = new SessionMessageService(
			sessionStore,
			new InMemorySessionMessageStore(),
			clock,
			messageIds::removeFirst
		);
		mockMvc = MockMvcBuilders.standaloneSetup(new SessionMessageController(messageService))
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
		sessionStore.create("session-001", Duration.ofMinutes(30));
	}

	@Test
	void returnsEmptyMessageArrayWithCommonResponseEnvelope() throws Exception {
		mockMvc.perform(get("/api/sessions/session-001/messages"))
			.andExpect(status().isOk())
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data.*", hasSize(1)))
			.andExpect(jsonPath("$.data.messages").isArray())
			.andExpect(jsonPath("$.data.messages").isEmpty());
	}

	@Test
	void storesPostedMessagesAndReturnsThemInOrder() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/messages")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "계약서를 확인해줘"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data.messageId").value("message-001"))
			.andExpect(jsonPath("$.data.role").value("USER"))
			.andExpect(jsonPath("$.data.content").value("계약서를 확인해줘"))
			.andExpect(jsonPath("$.data.createdAt").value("2026-08-19T00:00:00Z"));

		clock.advance(Duration.ofSeconds(1));
		messageService.addAiMessage("session-001", "확인해볼게요");

		mockMvc.perform(get("/api/sessions/session-001/messages"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.messages", hasSize(2)))
			.andExpect(jsonPath("$.data.messages[0].messageId").value("message-001"))
			.andExpect(jsonPath("$.data.messages[0].role").value("USER"))
			.andExpect(jsonPath("$.data.messages[0].content").value("계약서를 확인해줘"))
			.andExpect(jsonPath("$.data.messages[0].createdAt").value("2026-08-19T00:00:00Z"))
			.andExpect(jsonPath("$.data.messages[1].messageId").value("message-002"))
			.andExpect(jsonPath("$.data.messages[1].role").value("AI"))
			.andExpect(jsonPath("$.data.messages[1].content").value("확인해볼게요"))
			.andExpect(jsonPath("$.data.messages[1].createdAt").value("2026-08-19T00:00:01Z"));
	}

	@Test
	void returnsInvalidRequestForBlankMessageContent() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/messages")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "   "
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
			.andExpect(jsonPath("$.data.message", not(emptyOrNullString())));
	}

	@Test
	void doesNotAllowClientToCreateAiMessage() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/messages")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "role": "AI",
					  "content": "클라이언트가 작성한 메시지"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data.role").value("USER"))
			.andExpect(jsonPath("$.data.content").value("클라이언트가 작성한 메시지"));
	}

	@Test
	void returnsNotFoundForMissingSession() throws Exception {
		assertSessionNotFound("missing-session");
	}

	@Test
	void returnsNotFoundForExpiredSession() throws Exception {
		clock.advance(Duration.ofMinutes(30));

		assertSessionNotFound("session-001");
	}

	@Test
	void rejectsPostingMessageToMissingSession() throws Exception {
		mockMvc.perform(post("/api/sessions/missing-session/messages")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "저장하면 안 되는 메시지"
					}
					"""))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("SESSION_NOT_FOUND"))
			.andExpect(jsonPath("$.data.message", not(emptyOrNullString())));
	}

	private void assertSessionNotFound(String sessionId) throws Exception {
		mockMvc.perform(get("/api/sessions/{sessionId}/messages", sessionId))
			.andExpect(status().isNotFound())
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SESSION_NOT_FOUND"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data.*", hasSize(1)))
			.andExpect(jsonPath("$.data.message", not(emptyOrNullString())));
	}
}
