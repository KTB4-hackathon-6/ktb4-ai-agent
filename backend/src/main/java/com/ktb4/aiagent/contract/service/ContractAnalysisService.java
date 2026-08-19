package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.DocumentAnalysisRequest;
import com.ktb4.aiagent.analysis.DocumentAnalysisResult;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.contract.dto.Severity;
import com.ktb4.aiagent.session.SessionMessage;
import com.ktb4.aiagent.session.SessionMessageService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;
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
		SessionMessage userMessage = messageService.addUserMessage(sessionId, text);
		ContractDiagnosisContext context = diagnosisService.diagnoseWithContext(files);
		String requestId = requestIdSupplier.get();
		List<DocumentAnalysisRequest.Document> documents = toDocuments(requestId, context.documents());
		DocumentAnalysisRequest request = new DocumentAnalysisRequest(
			requestId,
			sessionId,
			text,
			documents,
			toLegalChecks(context.diagnosis(), documents)
		);
		DocumentAnalysisResult analysisResult = analysisClient.analyzeDocuments(request);
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
			ContractDiagnosis diagnosis,
			List<DocumentAnalysisRequest.Document> documents) {
		List<String> documentIds = documents.stream()
			.map(DocumentAnalysisRequest.Document::documentId)
			.toList();
		Map<String, Object> values = factsAsValues(diagnosis);
		Map<String, Long> totals = diagnosis.violations().stream()
			.collect(Collectors.groupingBy(RuleViolation::ruleId, Collectors.counting()));
		Map<String, Integer> occurrences = new HashMap<>();
		List<DocumentAnalysisRequest.LegalCheck> checks = new ArrayList<>();
		for (RuleViolation violation : diagnosis.violations()) {
			int occurrence = occurrences.merge(violation.ruleId(), 1, Integer::sum);
			String checkId = totals.get(violation.ruleId()) > 1
				? violation.ruleId() + "-" + occurrence
				: violation.ruleId();
			checks.add(toLegalCheck(checkId, violation, documentIds, values));
		}
		return List.copyOf(checks);
	}

	private DocumentAnalysisRequest.LegalCheck toLegalCheck(
			String checkId,
			RuleViolation violation,
			List<String> documentIds,
			Map<String, Object> values) {
		DocumentAnalysisRequest.CheckResult result = violation.severity() == Severity.WARNING
			? DocumentAnalysisRequest.CheckResult.VIOLATION
			: DocumentAnalysisRequest.CheckResult.POSSIBLE_VIOLATION;
		return new DocumentAnalysisRequest.LegalCheck(
			checkId,
			new DocumentAnalysisRequest.LegalReference(
				violation.lawName(),
				violation.article(),
				null,
				null
			),
			result,
			violation.message(),
			documentIds,
			values
		);
	}

	private Map<String, Object> factsAsValues(ContractDiagnosis diagnosis) {
		ContractFacts facts = diagnosis.facts();
		Map<String, Object> values = new LinkedHashMap<>();
		values.put("industry", facts.industry().value());
		values.put("weekly_working_hours", facts.weeklyWorkingHours());
		values.put("daily_working_hours", facts.dailyWorkingHours());
		values.put("rest_minutes_per_workday", facts.restMinutesPerWorkday());
		values.put("weekly_paid_holidays", facts.weeklyPaidHolidays());
		values.put("monthly_wage", facts.monthlyWage());
		values.put("hourly_wage", facts.hourlyWage());
		values.put("wage_specified", facts.wageSpecified());
		values.put("working_hours_specified", facts.workingHoursSpecified());
		values.put("holiday_specified", facts.holidaySpecified());
		values.put("contract_period_months", facts.contractPeriodMonths());
		values.put("payment_date_specified", facts.paymentDateSpecified());
		values.put("payment_method_in_person", facts.paymentMethodInPerson());
		values.put("accommodation_deduction_krw", facts.accommodationDeductionKrw());
		values.put("unverified_fields", diagnosis.unverifiedFields());
		return Map.copyOf(values);
	}
}
