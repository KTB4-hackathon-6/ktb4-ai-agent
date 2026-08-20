package com.ktb4.aiagent.document;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import com.ktb4.aiagent.analysis.DocumentPreparationOutcome;
import com.ktb4.aiagent.analysis.DocumentPreparationRequest;
import com.ktb4.aiagent.common.web.GlobalExceptionHandler;
import com.ktb4.aiagent.session.InMemorySessionMessageStore;
import com.ktb4.aiagent.session.InMemorySessionStore;
import com.ktb4.aiagent.session.SessionMessageService;
import java.io.InputStream;
import java.time.Duration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DocumentPreparationControllerTests {

	private MockMvc mockMvc;
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() throws Exception {
		objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
		mockMvc = createMockMvc(readOutcome());
	}

	private MockMvc createMockMvc(DocumentPreparationOutcome outcome) {
		AnalysisClient analysisClient = new AnalysisClient() {
			@Override
			public AnalysisOutcome review(
				String requestId,
				String sessionId,
				com.ktb4.aiagent.analysis.PreferredLanguage preferredLanguage,
				String content
			) {
				throw new UnsupportedOperationException();
			}

			@Override
			public DocumentPreparationOutcome prepareDocuments(DocumentPreparationRequest request) {
				return outcome;
			}
		};
		InMemorySessionStore sessionStore = new InMemorySessionStore();
		sessionStore.create("session-001", Duration.ofMinutes(30));
		SessionMessageService messageService = new SessionMessageService(
			sessionStore,
			new InMemorySessionMessageStore()
		);
		DocumentPreparationService service = new DocumentPreparationService(
			messageService,
			analysisClient,
			new HwpxFormGenerator(
				objectMapper,
				Clock.fixed(Instant.parse("2026-08-19T00:00:00Z"), ZoneOffset.UTC),
				() -> "document-001"
			),
			() -> "request-001"
		);
		return MockMvcBuilders.standaloneSetup(new DocumentPreparationController(service))
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void returnsStructuredDraftAndDownloadableHwpxInEnvelope() throws Exception {
		mockMvc.perform(post("/api/sessions/session-001/documents")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "진정서 작성을 시작해줘",
					  "preferredLanguage": "vi"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data.requestId").value("request-001"))
			.andExpect(jsonPath("$.data.documentDrafts[0].status").value("READY"))
			.andExpect(jsonPath("$.data.document.fileName").value("진정서-document-001.hwpx"))
			.andExpect(jsonPath("$.data.document.mimeType").value("application/hwp+zip"))
			.andExpect(jsonPath("$.data.document.bytes").isNotEmpty());
	}

	@Test
	void returnsAgentQuestionWhenRequiredDataIsMissing() throws Exception {
		mockMvc = createMockMvc(readMissingOutcome());

		mockMvc.perform(post("/api/sessions/session-001/documents")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "진정서 작성을 시작해줘",
					  "preferredLanguage": "vi"
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.answer").value("주소를 알려주세요."))
			.andExpect(jsonPath("$.data.documentDrafts[0].status").value("NEEDS_INPUT"))
			.andExpect(jsonPath("$.data.documentDrafts[0].missingFields[0].fieldId")
				.value("complainant.address"))
			.andExpect(jsonPath("$.data.documentDrafts[0].missingFields[0].question")
				.value("주소를 알려주세요."))
			.andExpect(jsonPath("$.data.document.bytes").isNotEmpty());
	}

	private DocumentPreparationOutcome readOutcome() throws Exception {
		try (InputStream input = getClass().getResourceAsStream(
			"/analysis/labor-complaint-ready.json"
		)) {
			JsonNode response = objectMapper.readTree(input);
			return objectMapper.treeToValue(
				response.path("result"),
				DocumentPreparationOutcome.class
			);
		}
	}

	private DocumentPreparationOutcome readMissingOutcome() throws Exception {
		try (InputStream input = getClass().getResourceAsStream(
			"/analysis/labor-complaint-ready.json"
		)) {
			ObjectNode result = (ObjectNode) objectMapper.readTree(input).path("result");
			result.put("answer", "주소를 알려주세요.");
			ObjectNode draft = (ObjectNode) result.path("documentDrafts").get(0);
			draft.put("status", "NEEDS_INPUT");
			((ObjectNode) draft.path("data").path("complainant")).putNull("address");
			ArrayNode missingFields = objectMapper.createArrayNode();
			missingFields.add(objectMapper.readTree("""
				{
				  "fieldId": "complainant.address",
				  "displayName": "주소",
				  "required": true,
				  "inputType": "TEXT",
				  "question": "주소를 알려주세요.",
				  "reason": "진정인 주소는 필수 항목입니다.",
				  "sensitive": false,
				  "validationRules": {
				    "pattern": null,
				    "minLength": 1,
				    "maxLength": 200,
				    "minValue": null,
				    "maxValue": null,
				    "allowedValues": []
				  },
				  "status": "MISSING"
				}
				"""));
			draft.set("missingFields", missingFields);
			return objectMapper.treeToValue(result, DocumentPreparationOutcome.class);
		}
	}
}
