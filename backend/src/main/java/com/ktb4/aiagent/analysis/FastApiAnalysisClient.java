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
	public AnalysisOutcome review(
		String requestId,
		String sessionId,
		PreferredLanguage preferredLanguage,
		String content
	) {
		ReviewRequest body = new ReviewRequest(
			requestId,
			sessionId,
			preferredLanguage,
			new ReviewInput(content, List.of()),
			List.of(),
			List.of()
		);
		ReviewResponse response = requestReview(body, requestId, sessionId);
		return response.result();
	}

	@Override
	public AnalysisOutcome reviewDocuments(DocumentAnalysisRequest request) {
		ReviewRequest body = new ReviewRequest(
			request.requestId(),
			request.sessionId(),
			request.preferredLanguage(),
			new ReviewInput(request.text(), request.documentIds()),
			request.documents(),
			request.legalChecks()
		);
		ReviewResponse response = requestReview(body, request.requestId(), request.sessionId());
		if (response.result().analysis() == null) {
			log.warn("FastAPI document review response had no structured analysis for requestId={}", request.requestId());
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		return response.result();
	}

	@Override
	public DocumentPreparationOutcome prepareDocuments(DocumentPreparationRequest request) {
		DocsRequest body = new DocsRequest(
			request.requestId(),
			request.sessionId(),
			request.preferredLanguage(),
			request.input()
		);
		DocsResponse response = requestDocs(body, request.requestId(), request.sessionId());
		return response.result();
	}

	@Override
	public GuidanceOutcome guide(GuidanceRequest request) {
		GuideRequest body = new GuideRequest(
			request.requestId(),
			request.sessionId(),
			request.preferredLanguage(),
			request.input()
		);
		GuideResponse response = requestGuide(body, request.requestId(), request.sessionId());
		return response.result();
	}

	private ReviewResponse requestReview(
		ReviewRequest request,
		String requestId,
		String sessionId
	) {
		ReviewResponse response;
		try {
			response = restClient.post()
				.uri("/review")
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(ReviewResponse.class);
		}
		catch (RestClientException exception) {
			log.warn(
				"FastAPI review request failed for requestId={} sessionId={}",
				requestId,
				sessionId,
				exception
			);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		if (!isValid(response, requestId, sessionId)) {
			log.warn("FastAPI review response was invalid for requestId={} sessionId={}", requestId, sessionId);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		return response;
	}

	private DocsResponse requestDocs(DocsRequest request, String requestId, String sessionId) {
		DocsResponse response;
		try {
			response = restClient.post()
				.uri("/docs")
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(DocsResponse.class);
		}
		catch (RestClientException exception) {
			log.warn("FastAPI docs request failed for requestId={} sessionId={}", requestId, sessionId, exception);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		if (response == null
			|| !Objects.equals(requestId, response.requestId())
			|| !Objects.equals(sessionId, response.sessionId())
			|| response.status() != AnalyzeStatus.COMPLETED
			|| response.result() == null
			|| response.error() != null) {
			log.warn("FastAPI docs response was invalid for requestId={} sessionId={}", requestId, sessionId);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		return response;
	}

	private GuideResponse requestGuide(GuideRequest request, String requestId, String sessionId) {
		GuideResponse response;
		try {
			response = restClient.post()
				.uri("/guide")
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(GuideResponse.class);
		}
		catch (RestClientException exception) {
			log.warn("FastAPI guide request failed for requestId={} sessionId={}", requestId, sessionId, exception);
			throw new ApplicationException(ErrorCode.AI_REQUEST_FAILED);
		}
		if (response == null
			|| !Objects.equals(requestId, response.requestId())
			|| !Objects.equals(sessionId, response.sessionId())
			|| response.status() != AnalyzeStatus.COMPLETED
			|| response.result() == null
			|| response.error() != null) {
			log.warn("FastAPI guide response was invalid for requestId={} sessionId={}", requestId, sessionId);
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

	private boolean isValid(ReviewResponse response, String requestId, String sessionId) {
		return response != null
			&& Objects.equals(requestId, response.requestId())
			&& Objects.equals(sessionId, response.sessionId())
			&& response.status() == AnalyzeStatus.COMPLETED
			&& response.result() != null
			&& response.result().answer() != null
			&& !response.result().answer().isBlank()
			&& response.error() == null;
	}

	private record ReviewRequest(
		String requestId,
		String sessionId,
		PreferredLanguage preferredLanguage,
		ReviewInput input,
		List<?> documents,
		List<?> legalChecks
	) {
	}

	private record ReviewInput(String text, List<String> documentIds) {
		private ReviewInput {
			if (text == null || text.isBlank() || text.length() > 4_000) {
				throw new IllegalArgumentException("Review text must be between 1 and 4000 characters");
			}
			documentIds = List.copyOf(Objects.requireNonNull(documentIds, "Document IDs must not be null"));
		}
	}

	private record DocsRequest(
		String requestId,
		String sessionId,
		PreferredLanguage preferredLanguage,
		DocumentPreparationRequest.Input input
	) {
	}

	private record GuideRequest(
		String requestId,
		String sessionId,
		PreferredLanguage preferredLanguage,
		GuidanceRequest.Input input
	) {
	}

	private enum AnalyzeStatus {

		COMPLETED,
		FAILED
	}

	private record ReviewResponse(
		String requestId,
		String sessionId,
		AnalyzeStatus status,
		AnalysisOutcome result,
		AnalyzeError error
	) {
	}

	private record DocsResponse(
		String requestId,
		String sessionId,
		AnalyzeStatus status,
		DocumentPreparationOutcome result,
		AnalyzeError error
	) {
	}

	private record GuideResponse(
		String requestId,
		String sessionId,
		AnalyzeStatus status,
		GuidanceOutcome result,
		AnalyzeError error
	) {
	}

	private record AnalyzeError(String code, String message) {
	}
}
