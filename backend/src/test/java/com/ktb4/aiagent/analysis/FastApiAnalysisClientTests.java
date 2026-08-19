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
