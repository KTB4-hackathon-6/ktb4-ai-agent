package com.ktb4.aiagent.document;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import com.ktb4.aiagent.analysis.DocumentPreparationOutcome;
import com.ktb4.aiagent.analysis.DocumentPreparationRequest;
import com.ktb4.aiagent.analysis.PreferredLanguage;
import com.ktb4.aiagent.session.SessionMessageService;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DocumentPreparationService {

	private final SessionMessageService messageService;
	private final AnalysisClient analysisClient;
	private final HwpxFormGenerator formGenerator;
	private final Supplier<String> requestIdSupplier;

	@Autowired
	public DocumentPreparationService(
		SessionMessageService messageService,
		AnalysisClient analysisClient,
		HwpxFormGenerator formGenerator
	) {
		this(messageService, analysisClient, formGenerator, () -> UUID.randomUUID().toString());
	}

	DocumentPreparationService(
		SessionMessageService messageService,
		AnalysisClient analysisClient,
		HwpxFormGenerator formGenerator,
		Supplier<String> requestIdSupplier
	) {
		this.messageService = Objects.requireNonNull(messageService, "Message service must not be null");
		this.analysisClient = Objects.requireNonNull(analysisClient, "Analysis client must not be null");
		this.formGenerator = Objects.requireNonNull(formGenerator, "Form generator must not be null");
		this.requestIdSupplier = Objects.requireNonNull(requestIdSupplier, "Request ID supplier must not be null");
	}

	public DocumentPreparationExchange prepare(
		String sessionId,
		String content,
		PreferredLanguage preferredLanguage
	) {
		messageService.addUserMessage(sessionId, content);
		String requestId = requestIdSupplier.get();
		DocumentPreparationOutcome outcome = analysisClient.prepareDocuments(
			new DocumentPreparationRequest(
				requestId,
				sessionId,
				preferredLanguage,
				new DocumentPreparationRequest.Input(content)
			)
		);
		messageService.addAiMessage(sessionId, outcome.answer());
		AnalysisOutcome.DocumentDraft draft = outcome.documentDrafts().getFirst();
		GeneratedDocument document = formGenerator.generatePartial(draft.data());
		return new DocumentPreparationExchange(
			requestId,
			outcome.answer(),
			outcome.documentDrafts(),
			document
		);
	}

	@Schema(description = "진정서 작성 진행 결과와 현재 HWPX 파일")
	public record DocumentPreparationExchange(
		@Schema(description = "AI 문서 작성 요청 식별자") String requestId,
		@Schema(description = "사용자에게 보여줄 작성 안내") String answer,
		@Schema(description = "현재 구조화된 진정서 초안")
		List<AnalysisOutcome.DocumentDraft> documentDrafts,
		@Schema(description = "현재 값까지 반영한 HWPX 파일") GeneratedDocument document
	) {
		public DocumentPreparationExchange {
			documentDrafts = List.copyOf(documentDrafts);
		}
	}
}
