package com.ktb4.aiagent.session;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.common.web.GlobalExceptionHandler;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SessionControllerTests {

	private InMemorySessionStore store;
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-08-19T00:00:00Z"), ZoneOffset.UTC);
		store = new InMemorySessionStore(clock);
		SessionService sessionService = new SessionService(
			store,
			Duration.ofMinutes(30),
			() -> "session-001"
		);
		mockMvc = MockMvcBuilders.standaloneSetup(new SessionController(sessionService))
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void createsTemporarySessionWithCommonResponseEnvelope() throws Exception {
		mockMvc.perform(post("/api/sessions"))
			.andExpect(status().isCreated())
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data.*", hasSize(1)))
			.andExpect(jsonPath("$.data.sessionId").value("session-001"));

		assertTrue(store.findActive("session-001").isPresent());
	}
}
