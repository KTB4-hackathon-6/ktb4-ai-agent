package com.ktb4.aiagent.analysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class FastApiAnalysisClientTests {

	private static final String BASE_URL = "http://localhost:8000";

	private MockRestServiceServer server;
	private FastApiAnalysisClient client;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		client = new FastApiAnalysisClient(builder.baseUrl(BASE_URL).build());
	}

	@Test
	void sendsCurrentMessageWithSessionAndRequestIdentifiers() {
		server.expect(requestTo(BASE_URL + "/review"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(content().json("""
				{
				  "requestId": "request-001",
				  "sessionId": "session-001",
				  "preferredLanguage": "vi",
				  "input": {
				    "text": "계약서를 확인해줘",
				    "documentIds": []
				  },
				  "documents": [],
				  "legalChecks": []
				}
				"""))
			.andRespond(withSuccess("""
				{
				  "requestId": "request-001",
				  "sessionId": "session-001",
				  "status": "COMPLETED",
				  "result": {
				    "answer": "확인이 필요합니다.",
				    "analysis": null
				  },
				  "error": null
				}
				""", MediaType.APPLICATION_JSON));

		AnalysisOutcome outcome = client.review(
			"request-001",
			"session-001",
			PreferredLanguage.VI,
			"계약서를 확인해줘"
		);

		assertEquals("확인이 필요합니다.", outcome.answer());
		assertEquals(null, outcome.analysis());
		server.verify();
	}

	@Test
	void rejectsReviewWithoutInputText() {
		assertThrows(
			IllegalArgumentException.class,
			() -> client.review("request-001", "session-001", PreferredLanguage.VI, " ")
		);
	}

	@Test
	void rejectsDocsWithoutInputText() {
		assertThrows(
			IllegalArgumentException.class,
			() -> new DocumentPreparationRequest(
				"docs-001",
				"session-001",
				PreferredLanguage.VI,
				new DocumentPreparationRequest.Input(" ")
			)
		);
	}

	@Test
	void sendsOcrDocumentsAndLegalChecksForContractReview() {
		server.expect(requestTo(BASE_URL + "/review"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(content().json("""
				{
				  "requestId": "request-002",
				  "sessionId": "session-001",
				  "preferredLanguage": "vi",
				  "input": {
				    "text": "계약서 문제를 설명해줘",
				    "documentIds": ["document-1"]
				  },
				  "documents": [{
				    "documentId": "document-1",
				    "fileName": "contract.jpg",
				    "pages": [{"pageNumber": 1, "text": "월급 1,750,000원"}]
				  }],
				  "legalChecks": [{
				    "checkId": "BELOW_MINIMUM_WAGE",
				    "result": "DETECTED",
				    "lawName": "최저임금법",
				    "article": "제6조",
				    "message": "시급이 최저임금보다 낮습니다."
				  }]
				}
				"""))
			.andRespond(withSuccess("""
				{
				  "requestId": "request-002",
				  "sessionId": "session-001",
				  "status": "COMPLETED",
				  "result": {
				    "answer": "최저임금 미달 문제를 확인했습니다.",
				    "analysis": {
				      "summary": "최저임금 위반",
				      "findings": [{
					        "title": "MINIMUM_WAGE",
					        "description": "시급이 최저임금보다 낮습니다.",
					        "severity": "HIGH",
					        "relatedDocumentIds": ["document-1"]
					      }],
					      "nextActions": ["임금 조정을 요청합니다."]
				    }
				  },
				  "error": null
				}
				""", MediaType.APPLICATION_JSON));

		DocumentAnalysisRequest request = new DocumentAnalysisRequest(
			"request-002",
			"session-001",
			PreferredLanguage.VI,
			"계약서 문제를 설명해줘",
			List.of(new DocumentAnalysisRequest.Document(
				"document-1",
				"contract.jpg",
				List.of(new DocumentAnalysisRequest.Page(1, "월급 1,750,000원"))
			)),
			List.of(new DocumentAnalysisRequest.LegalCheck(
				DocumentAnalysisRequest.CheckId.BELOW_MINIMUM_WAGE,
				DocumentAnalysisRequest.CheckResult.DETECTED,
				"최저임금법",
				"제6조",
				"시급이 최저임금보다 낮습니다."
			))
		);

		AnalysisOutcome result = client.reviewDocuments(request);

		assertEquals("최저임금 미달 문제를 확인했습니다.", result.answer());
		assertEquals("최저임금 위반", result.analysis().summary());
		assertEquals("MINIMUM_WAGE", result.analysis().findings().getFirst().title());
		server.verify();
	}

	@Test
	void sendsTextForDocumentPreparation() throws Exception {
		server.expect(requestTo(BASE_URL + "/docs"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(content().json("""
				{
				  "requestId": "docs-001",
				  "sessionId": "session-001",
				  "preferredLanguage": "vi",
				  "input": {"text": "진정서 작성을 시작해줘"}
				}
				"""))
			.andRespond(withSuccess(sharedFixture(), MediaType.APPLICATION_JSON));

		DocumentPreparationOutcome outcome = client.prepareDocuments(new DocumentPreparationRequest(
			"docs-001",
			"session-001",
			PreferredLanguage.VI,
			new DocumentPreparationRequest.Input("진정서 작성을 시작해줘")
		));

		AnalysisOutcome.DocumentDraft draft = outcome.documentDrafts().getFirst();
		assertEquals(AnalysisOutcome.DocumentDraftStatus.READY, draft.status());
		assertEquals("NGUYEN VAN TEST", draft.data().complainant().fullName());
		assertEquals(406_923L, draft.data().complaint().unpaidWagesTotal());
		server.verify();
	}

	@Test
	void sendsTextAndReturnsResolutionGuidance() {
		server.expect(requestTo(BASE_URL + "/guide"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(content().json("""
				{
				  "requestId": "guide-001",
				  "sessionId": "session-001",
				  "preferredLanguage": "vi",
				  "input": {"text": "완성한 진정서를 어디에 제출해야 해?"}
				}
				"""))
			.andRespond(withSuccess("""
				{
				  "requestId": "guide-001",
				  "sessionId": "session-001",
				  "status": "COMPLETED",
				  "result": {
				    "answer": "관할 지방고용노동관서에 제출할 수 있습니다.",
				    "agencyCode": "MOEL",
				    "agencyName": "고용노동부",
				    "jurisdictionOfficeName": "관할 지방고용노동관서",
				    "submissionOptions": [{
				      "channel": "ONLINE",
				      "label": "온라인 제출",
				      "url": "https://official-service.example/labor-complaint",
				      "address": null,
				      "instructions": "공식 민원 서비스에서 제출합니다."
				    }],
				    "requiredAttachments": ["근로계약서"],
				    "steps": ["작성 내용을 확인합니다.", "공식 민원 서비스에서 제출합니다."],
				    "notes": "제출 전 관할 기관을 확인합니다."
				  },
				  "error": null
				}
				""", MediaType.APPLICATION_JSON));

		GuidanceOutcome outcome = client.guide(new GuidanceRequest(
			"guide-001",
			"session-001",
			PreferredLanguage.VI,
			new GuidanceRequest.Input("완성한 진정서를 어디에 제출해야 해?")
		));

		assertEquals(GuidanceOutcome.AgencyCode.MOEL, outcome.agencyCode());
		assertEquals(GuidanceOutcome.SubmissionChannel.ONLINE, outcome.submissionOptions().getFirst().channel());
		server.verify();
	}

	@Test
	void rejectsResponseWithDifferentSessionIdentifier() {
		server.expect(requestTo(BASE_URL + "/review"))
			.andRespond(withSuccess("""
				{
				  "requestId": "request-001",
				  "sessionId": "different-session",
				  "status": "COMPLETED",
				  "result": {
				    "answer": "저장하면 안 되는 응답",
				    "analysis": null
				  },
				  "error": null
				}
				""", MediaType.APPLICATION_JSON));

		ApplicationException exception = assertThrows(
			ApplicationException.class,
			() -> client.review("request-001", "session-001", PreferredLanguage.VI, "질문")
		);

		assertEquals(ErrorCode.AI_REQUEST_FAILED, exception.errorCode());
	}

	@Test
	void mapsFastApiFailureToBadGatewayError() {
		server.expect(requestTo(BASE_URL + "/review"))
			.andRespond(withStatus(HttpStatus.BAD_GATEWAY)
				.contentType(MediaType.APPLICATION_JSON)
				.body("""
					{
					  "requestId": "request-001",
					  "sessionId": "session-001",
					  "status": "FAILED",
					  "result": null,
					  "error": {
					    "code": "MODEL_REQUEST_FAILED",
					    "message": "AI 모델 요청에 실패했습니다."
					  }
					}
					"""));

		ApplicationException exception = assertThrows(
			ApplicationException.class,
			() -> client.review("request-001", "session-001", PreferredLanguage.VI, "질문")
		);

		assertEquals(ErrorCode.AI_REQUEST_FAILED, exception.errorCode());
	}

	private String sharedFixture() throws IOException {
		try (InputStream input = getClass().getResourceAsStream(
			"/analysis/labor-complaint-ready.json"
		)) {
			if (input == null) {
				throw new IllegalStateException("Shared analysis fixture is missing");
			}
			return new String(input.readAllBytes(), StandardCharsets.UTF_8);
		}
	}
}
