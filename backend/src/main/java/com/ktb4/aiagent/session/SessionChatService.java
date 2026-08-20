package com.ktb4.aiagent.session;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SessionChatService {

	private final SessionMessageService messageService;
	private final AnalysisClient analysisClient;
	private final Supplier<String> requestIdSupplier;

	@Autowired
	public SessionChatService(
		SessionMessageService messageService,
		AnalysisClient analysisClient
	) {
		this(messageService, analysisClient, () -> UUID.randomUUID().toString());
	}

	SessionChatService(
		SessionMessageService messageService,
		AnalysisClient analysisClient,
		Supplier<String> requestIdSupplier
	) {
		this.messageService = Objects.requireNonNull(
			messageService,
			"Message service must not be null"
		);
		this.analysisClient = Objects.requireNonNull(
			analysisClient,
			"Analysis client must not be null"
		);
		this.requestIdSupplier = Objects.requireNonNull(
			requestIdSupplier,
			"Request ID supplier must not be null"
		);
	}

	public ChatExchange chat(String sessionId, String content) {
		SessionMessage userMessage = messageService.addUserMessage(sessionId, content);
		String requestId = requestIdSupplier.get();
		AnalysisOutcome outcome = analysisClient.review(requestId, sessionId, content);
		SessionMessage aiMessage = messageService.addAiMessage(sessionId, outcome.answer());
		return new ChatExchange(requestId, outcome.analysis(), userMessage, aiMessage);
	}

	@Schema(description = "상담 채팅 처리 결과")
	public record ChatExchange(
		@Schema(description = "AI 분석 요청 식별자") String requestId,
		@Schema(description = "구조화된 분석 및 문서 초안", nullable = true)
		AnalysisOutcome.Analysis analysis,
		@Schema(description = "저장된 사용자 메시지") SessionMessage userMessage,
		@Schema(description = "저장된 AI 답변 메시지") SessionMessage aiMessage
	) {
	}
}
