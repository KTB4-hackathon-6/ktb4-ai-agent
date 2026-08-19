package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ktb4.aiagent.analysis.AnalysisClient;
import com.ktb4.aiagent.analysis.DocumentAnalysisRequest;
import com.ktb4.aiagent.analysis.DocumentAnalysisResult;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.contract.dto.Severity;
import com.ktb4.aiagent.session.MessageRole;
import com.ktb4.aiagent.session.SessionMessage;
import com.ktb4.aiagent.session.SessionMessageService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class ContractAnalysisServiceTests {

	@Test
	void sendsOcrDocumentsAndRuleViolationsToFastApiAndStoresConversation() {
		ContractDiagnosisService diagnosisService = mock(ContractDiagnosisService.class);
		AnalysisClient analysisClient = mock(AnalysisClient.class);
		SessionMessageService messageService = mock(SessionMessageService.class);
		List<MultipartFile> files = List.of(file("front.jpg"), file("back.jpg"));
		ContractDiagnosis diagnosis = diagnosis();
		when(diagnosisService.diagnoseWithContext(any(), any())).thenReturn(new ContractDiagnosisContext(
			diagnosis,
			List.of(
				new ContractDiagnosisContext.SourceDocument("front.jpg", "앞면 OCR"),
				new ContractDiagnosisContext.SourceDocument("back.jpg", "뒷면 OCR")
			)
		));
		when(messageService.addUserMessage("session-001", "계약서 문제를 설명해줘"))
			.thenReturn(message("user-message", MessageRole.USER, "계약서 문제를 설명해줘"));
		when(analysisClient.analyzeDocuments(any())).thenReturn(new DocumentAnalysisResult(
			"최저임금과 계약기간을 확인하세요.",
			new DocumentAnalysisResult.Analysis(
				"계약서 문제 두 건",
				List.of(new DocumentAnalysisResult.Finding(
					"MINIMUM_WAGE",
					"최저임금 미달",
					"HIGH",
					List.of("below_minimum_wage"),
					List.of("request-001-document-1", "request-001-document-2")
				)),
				List.of("임금 조정을 요청합니다.")
			)
		));
		when(messageService.addAiMessage("session-001", "최저임금과 계약기간을 확인하세요."))
			.thenReturn(message("ai-message", MessageRole.AI, "최저임금과 계약기간을 확인하세요."));
		ContractAnalysisService service = new ContractAnalysisService(
			diagnosisService,
			analysisClient,
			messageService,
			() -> "request-001"
		);

		var result = service.analyze("session-001", "계약서 문제를 설명해줘", files);

		ArgumentCaptor<DocumentAnalysisRequest> requestCaptor = ArgumentCaptor.forClass(
			DocumentAnalysisRequest.class
		);
		verify(analysisClient).analyzeDocuments(requestCaptor.capture());
		DocumentAnalysisRequest request = requestCaptor.getValue();
		assertThat(request.documentIds())
			.containsExactly("request-001-document-1", "request-001-document-2");
		assertThat(request.documents())
			.extracting(DocumentAnalysisRequest.Document::fileName)
			.containsExactly("front.jpg", "back.jpg");
		assertThat(request.documents())
			.flatExtracting(DocumentAnalysisRequest.Document::pages)
			.extracting(DocumentAnalysisRequest.Page::pageNumber)
			.containsExactly(1, 1);
		assertThat(request.documents().getFirst().pages().getFirst().text()).isEqualTo("앞면 OCR");
		assertThat(request.legalChecks())
			.extracting(DocumentAnalysisRequest.LegalCheck::result)
			.containsExactly(
				DocumentAnalysisRequest.CheckResult.VIOLATION,
				DocumentAnalysisRequest.CheckResult.POSSIBLE_VIOLATION
			);
		assertThat(request.legalChecks().getFirst().values())
			.containsEntry("hourly_wage", 9_000)
			.containsEntry("unverified_fields", List.of("weekly_working_hours"));
		assertThat(result.requestId()).isEqualTo("request-001");
		assertThat(result.diagnosis()).isEqualTo(diagnosis);
		assertThat(result.analysis().summary()).isEqualTo("계약서 문제 두 건");
		assertThat(result.userMessage().messageId()).isEqualTo("user-message");
		assertThat(result.aiMessage().messageId()).isEqualTo("ai-message");
	}

	private MockMultipartFile file(String name) {
		return new MockMultipartFile("files", name, "image/jpeg", "fake".getBytes());
	}

	private SessionMessage message(String id, MessageRole role, String content) {
		return new SessionMessage(id, role, content, Instant.EPOCH);
	}

	private ContractDiagnosis diagnosis() {
		ContractFacts facts = new ContractFacts(
			IndustryCategory.MANUFACTURING,
			0,
			8,
			30,
			1,
			1_600_000,
			9_000,
			true,
			true,
			true,
			48,
			true,
			false,
			350_000
		);
		return new ContractDiagnosis(
			facts,
			List.of(
				new RuleViolation(
					"below_minimum_wage",
					"최저임금법",
					"제6조",
					"최저임금에 미달합니다.",
					Severity.WARNING
				),
				new RuleViolation(
					"contract_period_review",
					"외국인근로자의 고용 등에 관한 법률",
					"제18조의2",
					"연장허가를 확인하세요.",
					Severity.REVIEW
				)
			),
			List.of("weekly_working_hours")
		);
	}
}
