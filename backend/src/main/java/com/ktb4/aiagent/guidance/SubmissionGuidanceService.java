package com.ktb4.aiagent.guidance;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.GuidanceOutcome;
import com.ktb4.aiagent.analysis.GuidanceRequest;
import com.ktb4.aiagent.analysis.PreferredLanguage;
import com.ktb4.aiagent.session.SessionMessageService;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SubmissionGuidanceService {

	private final SessionMessageService messageService;
	private final AnalysisClient analysisClient;
	private final Supplier<String> requestIdSupplier;

	@Autowired
	public SubmissionGuidanceService(
		SessionMessageService messageService,
		AnalysisClient analysisClient
	) {
		this(messageService, analysisClient, () -> UUID.randomUUID().toString());
	}

	SubmissionGuidanceService(
		SessionMessageService messageService,
		AnalysisClient analysisClient,
		Supplier<String> requestIdSupplier
	) {
		this.messageService = Objects.requireNonNull(messageService, "Message service must not be null");
		this.analysisClient = Objects.requireNonNull(analysisClient, "Analysis client must not be null");
		this.requestIdSupplier = Objects.requireNonNull(requestIdSupplier, "Request ID supplier must not be null");
	}

	public GuidanceOutcome guide(
		String sessionId,
		String content,
		PreferredLanguage preferredLanguage
	) {
		messageService.addUserMessage(sessionId, content);
		GuidanceOutcome outcome = analysisClient.guide(new GuidanceRequest(
			requestIdSupplier.get(),
			sessionId,
			preferredLanguage,
			new GuidanceRequest.Input(content)
		));
		messageService.addAiMessage(sessionId, outcome.answer());
		return outcome;
	}
}
