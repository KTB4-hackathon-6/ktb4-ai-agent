package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import com.ktb4.aiagent.analysis.DocumentAnalysisRequest;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.contract.dto.Severity;
import com.ktb4.aiagent.session.SessionMessage;
import com.ktb4.aiagent.session.SessionMessageService;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ContractAnalysisService {

	private final ContractDiagnosisService diagnosisService;
	private final AnalysisClient analysisClient;
	private final SessionMessageService messageService;
	private final Supplier<String> requestIdSupplier;

	@Autowired
	public ContractAnalysisService(
			ContractDiagnosisService diagnosisService,
			AnalysisClient analysisClient,
			SessionMessageService messageService) {
		this(diagnosisService, analysisClient, messageService, () -> UUID.randomUUID().toString());
	}

	ContractAnalysisService(
			ContractDiagnosisService diagnosisService,
			AnalysisClient analysisClient,
			SessionMessageService messageService,
			Supplier<String> requestIdSupplier) {
		this.diagnosisService = Objects.requireNonNull(diagnosisService, "Diagnosis service must not be null");
		this.analysisClient = Objects.requireNonNull(analysisClient, "Analysis client must not be null");
		this.messageService = Objects.requireNonNull(messageService, "Message service must not be null");
		this.requestIdSupplier = Objects.requireNonNull(requestIdSupplier, "Request ID supplier must not be null");
	}

	public ContractAnalysisResponse analyze(
			String sessionId,
			String text,
			List<MultipartFile> files) {
		return analyze(sessionId, text, files, ContractAnalysisProgressListener.none());
	}

	public ContractAnalysisResponse analyze(
			String sessionId,
			String text,
			List<MultipartFile> files,
			ContractAnalysisProgressListener progressListener) {
		SessionMessage userMessage = messageService.addUserMessage(sessionId, text);
		ContractDiagnosisContext context = diagnosisService.diagnoseWithContext(files, progressListener);
		String requestId = requestIdSupplier.get();
		List<DocumentAnalysisRequest.Document> documents = toDocuments(requestId, context.documents());
		DocumentAnalysisRequest request = new DocumentAnalysisRequest(
			requestId,
			sessionId,
			text,
			documents,
			toLegalChecks(context.diagnosis())
		);
		progressListener.onGeneratingResponse();
		AnalysisOutcome analysisResult = analysisClient.reviewDocuments(request);
		SessionMessage aiMessage = messageService.addAiMessage(sessionId, analysisResult.answer());
		return new ContractAnalysisResponse(
			requestId,
			context.diagnosis(),
			analysisResult.answer(),
			analysisResult.analysis(),
			userMessage,
			aiMessage
		);
	}

	private List<DocumentAnalysisRequest.Document> toDocuments(
			String requestId,
			List<ContractDiagnosisContext.SourceDocument> sourceDocuments) {
		List<DocumentAnalysisRequest.Document> documents = new ArrayList<>();
		for (int index = 0; index < sourceDocuments.size(); index++) {
			ContractDiagnosisContext.SourceDocument source = sourceDocuments.get(index);
			documents.add(new DocumentAnalysisRequest.Document(
				requestId + "-document-" + (index + 1),
				source.fileName(),
				List.of(new DocumentAnalysisRequest.Page(1, source.text()))
			));
		}
		return List.copyOf(documents);
	}

	private List<DocumentAnalysisRequest.LegalCheck> toLegalChecks(
			ContractDiagnosis diagnosis) {
		List<DocumentAnalysisRequest.LegalCheck> checks = new ArrayList<>();
		for (RuleViolation violation : diagnosis.violations()) {
			checks.add(toLegalCheck(violation));
		}
		return List.copyOf(checks);
	}

	private DocumentAnalysisRequest.LegalCheck toLegalCheck(
			RuleViolation violation) {
		DocumentAnalysisRequest.CheckResult result = violation.severity() == Severity.WARNING
			? DocumentAnalysisRequest.CheckResult.DETECTED
			: DocumentAnalysisRequest.CheckResult.REVIEW_REQUIRED;
		return new DocumentAnalysisRequest.LegalCheck(
			DocumentAnalysisRequest.CheckId.fromRuleId(violation.ruleId()),
			result
		);
	}
}
