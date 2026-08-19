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
import java.util.List;
import java.util.Map;
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
		server.expect(requestTo(BASE_URL + "/analyze"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(content().json("""
				{
				  "requestId": "request-001",
				  "sessionId": "session-001",
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

		String answer = client.analyze("request-001", "session-001", "계약서를 확인해줘");

		assertEquals("확인이 필요합니다.", answer);
		server.verify();
	}

	@Test
	void sendsOcrDocumentsAndLegalChecksForContractReview() {
		server.expect(requestTo(BASE_URL + "/analyze"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(content().json("""
				{
				  "requestId": "request-002",
				  "sessionId": "session-001",
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
				    "checkId": "below_minimum_wage",
				    "legalReference": {
				      "lawName": "최저임금법",
				      "article": "제6조",
				      "paragraph": null,
				      "item": null
				    },
				    "result": "VIOLATION",
				    "reason": "최저임금에 미달합니다.",
				    "relatedDocumentIds": ["document-1"],
				    "values": {"hourly_wage": 8373}
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
				        "relatedCheckIds": ["below_minimum_wage"],
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
			"계약서 문제를 설명해줘",
			List.of(new DocumentAnalysisRequest.Document(
				"document-1",
				"contract.jpg",
				List.of(new DocumentAnalysisRequest.Page(1, "월급 1,750,000원"))
			)),
			List.of(new DocumentAnalysisRequest.LegalCheck(
				"below_minimum_wage",
				new DocumentAnalysisRequest.LegalReference("최저임금법", "제6조", null, null),
				DocumentAnalysisRequest.CheckResult.VIOLATION,
				"최저임금에 미달합니다.",
				List.of("document-1"),
				Map.of("hourly_wage", 8373)
			))
		);

		DocumentAnalysisResult result = client.analyzeDocuments(request);

		assertEquals("최저임금 미달 문제를 확인했습니다.", result.answer());
		assertEquals("최저임금 위반", result.analysis().summary());
		assertEquals("MINIMUM_WAGE", result.analysis().findings().getFirst().title());
		server.verify();
	}

	@Test
	void rejectsResponseWithDifferentSessionIdentifier() {
		server.expect(requestTo(BASE_URL + "/analyze"))
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
			() -> client.analyze("request-001", "session-001", "질문")
		);

		assertEquals(ErrorCode.AI_REQUEST_FAILED, exception.errorCode());
	}

	@Test
	void mapsFastApiFailureToBadGatewayError() {
		server.expect(requestTo(BASE_URL + "/analyze"))
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
			() -> client.analyze("request-001", "session-001", "질문")
		);

		assertEquals(ErrorCode.AI_REQUEST_FAILED, exception.errorCode());
	}
}
