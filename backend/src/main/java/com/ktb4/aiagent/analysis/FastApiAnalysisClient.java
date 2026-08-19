package com.ktb4.aiagent.analysis;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class FastApiAnalysisClient implements AnalysisClient {

	private static final Logger log = LoggerFactory.getLogger(FastApiAnalysisClient.class);

	private final RestClient restClient;

	@Autowired
	public FastApiAnalysisClient(
		@Value("${app.ai.base-url}") String baseUrl,
		@Value("${app.ai.connect-timeout}") Duration connectTimeout,
		@Value("${app.ai.read-timeout}") Duration readTimeout
	) {
		this(createRestClient(baseUrl, connectTimeout, readTimeout));
	}

	FastApiAnalysisClient(RestClient restClient) {
		this.restClient = Objects.requireNonNull(restClient, "Rest client must not be null");
	}

	@Override
	public String analyze(String requestId, String sessionId, String content) {
		AnalyzeRequest body = new AnalyzeRequest(
			requestId,
			sessionId,
			new AnalyzeInput(content, List.of()),
			List.of(),
			List.of()
		);
		AnalyzeResponse response = request(body, requestId, sessionId);
		return response.result().answer();
	}

	@Override
	public DocumentAnalysisResult analyzeDocuments(DocumentAnalysisRequest request) {
		AnalyzeRequest body = new AnalyzeRequest(
			request.requestId(),
			request.sessionId(),
			new AnalyzeInput(request.text(), request.documentIds()),
			request.documents(),
			request.legalChecks()
		);
		AnalyzeResponse response = request(body, request.requestId(), request.sessionId());
		if (response.result().analysis() == null) {
			log.warn("FastAPI document analysis response had no structured analysis for requestId={}", request.requestId());
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		return new DocumentAnalysisResult(response.result().answer(), response.result().analysis());
	}

	private AnalyzeResponse request(AnalyzeRequest request, String requestId, String sessionId) {
		AnalyzeResponse response;
		try {
			response = restClient.post()
				.uri("/analyze")
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(AnalyzeResponse.class);
		}
		catch (RestClientException exception) {
			log.warn(
				"FastAPI analysis request failed for requestId={} sessionId={}",
				requestId,
				sessionId,
				exception
			);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		if (!isValid(response, requestId, sessionId)) {
			log.warn("FastAPI analysis response was invalid for requestId={} sessionId={}", requestId, sessionId);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		return response;
	}

	private static RestClient createRestClient(
		String baseUrl,
		Duration connectTimeout,
		Duration readTimeout
	) {
		if (baseUrl == null || baseUrl.isBlank()) {
			throw new IllegalArgumentException("AI base URL must not be blank");
		}
		if (connectTimeout == null || connectTimeout.isZero() || connectTimeout.isNegative()) {
			throw new IllegalArgumentException("AI connect timeout must be positive");
		}
		if (readTimeout == null || readTimeout.isZero() || readTimeout.isNegative()) {
			throw new IllegalArgumentException("AI read timeout must be positive");
		}

		HttpClient httpClient = HttpClient.newBuilder()
			.version(HttpClient.Version.HTTP_1_1)
			.connectTimeout(connectTimeout)
			.build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(readTimeout);
		return RestClient.builder()
			.baseUrl(baseUrl)
			.requestFactory(requestFactory)
			.build();
	}

	private boolean isValid(AnalyzeResponse response, String requestId, String sessionId) {
		return response != null
			&& Objects.equals(requestId, response.requestId())
			&& Objects.equals(sessionId, response.sessionId())
			&& response.status() == AnalyzeStatus.COMPLETED
			&& response.result() != null
			&& response.result().answer() != null
			&& !response.result().answer().isBlank()
			&& response.error() == null;
	}

	private record AnalyzeRequest(
		String requestId,
		String sessionId,
		AnalyzeInput input,
		List<?> documents,
		List<?> legalChecks
	) {
	}

	private record AnalyzeInput(String text, List<String> documentIds) {
	}

	private enum AnalyzeStatus {

		COMPLETED,
		FAILED
	}

	private record AnalyzeResponse(
		String requestId,
		String sessionId,
		AnalyzeStatus status,
		AnalyzeResult result,
		AnalyzeError error
	) {
	}

	private record AnalyzeResult(String answer, DocumentAnalysisResult.Analysis analysis) {
	}

	private record AnalyzeError(String code, String message) {
	}
}
