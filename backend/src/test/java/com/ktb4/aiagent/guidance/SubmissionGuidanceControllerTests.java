package com.ktb4.aiagent.guidance;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.GuidanceOutcome;
import com.ktb4.aiagent.analysis.GuidanceRequest;
import com.ktb4.aiagent.common.web.GlobalExceptionHandler;
import com.ktb4.aiagent.session.InMemorySessionMessageStore;
import com.ktb4.aiagent.session.InMemorySessionStore;
import com.ktb4.aiagent.session.SessionMessageService;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SubmissionGuidanceControllerTests {

	private MockMvc mockMvc;
	private AtomicReference<GuidanceRequest> capturedRequest;

	@BeforeEach
	void setUp() {
		capturedRequest = new AtomicReference<>();
		AnalysisClient analysisClient = new AnalysisClient() {
			@Override
			public com.ktb4.aiagent.analysis.AnalysisOutcome review(
				String requestId,
				String sessionId,
				com.ktb4.aiagent.analysis.PreferredLanguage preferredLanguage,
				String content
			) {
				throw new UnsupportedOperationException();
			}

			@Override
			public GuidanceOutcome guide(GuidanceRequest request) {
				capturedRequest.set(request);
				return new GuidanceOutcome(
					"관할 지방고용노동관서에 제출할 수 있습니다.",
					GuidanceOutcome.AgencyCode.MOEL,
					"고용노동부",
					"고용노동부 안산지청",
					List.of(new GuidanceOutcome.SubmissionOption(
						GuidanceOutcome.SubmissionChannel.ONLINE,
						"노동포털 온라인 제출",
						"https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001",
						null,
						"로그인한 뒤 제출합니다."
					)),
					List.of("근로계약서"),
					List.of("작성 내용을 확인합니다."),
					"실제 근무지 기준입니다."
				);
			}
		};
		InMemorySessionStore sessionStore = new InMemorySessionStore();
		sessionStore.create("session-001", Duration.ofMinutes(30));
		SubmissionGuidanceService service = new SubmissionGuidanceService(
			new SessionMessageService(sessionStore, new InMemorySessionMessageStore()),
			analysisClient,
			() -> "guide-001"
		);
		mockMvc = MockMvcBuilders.standaloneSetup(new SubmissionGuidanceController(service))
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void returnsSubmissionGuidanceInEnvelope() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/guidance")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "완성한 진정서를 어디에 제출해야 해?",
					  "preferredLanguage": "ko"
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data.agencyCode").value("MOEL"))
			.andExpect(jsonPath("$.data.jurisdictionOfficeName").value("고용노동부 안산지청"))
			.andExpect(jsonPath("$.data.submissionOptions[0].channel").value("ONLINE"))
			.andExpect(jsonPath("$.data.submissionOptions[0].url").value(
				"https://labor.moel.go.kr/minwonApply/minwonFormat.do?searchVal=SN001"
			));

		GuidanceRequest request = capturedRequest.get();
		org.assertj.core.api.Assertions.assertThat(request.requestId()).isEqualTo("guide-001");
		org.assertj.core.api.Assertions.assertThat(request.sessionId()).isEqualTo("session-001");
		org.assertj.core.api.Assertions.assertThat(request.input().text())
			.isEqualTo("완성한 진정서를 어디에 제출해야 해?");
	}
}
