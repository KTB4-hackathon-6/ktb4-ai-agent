package com.ktb4.aiagent.contract.controller;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.analysis.DocumentAnalysisResult;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.contract.dto.Severity;
import com.ktb4.aiagent.contract.service.ContractAnalysisService;
import com.ktb4.aiagent.contract.service.ContractDiagnosisService;
import com.ktb4.aiagent.session.MessageRole;
import com.ktb4.aiagent.session.SessionMessage;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ContractController.class)
class ContractControllerTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private ContractDiagnosisService diagnosisService;

	@MockitoBean
	private ContractAnalysisService analysisService;

	@Test
	void returnsStructuredDiagnosisUsingFastApiCompatibleFieldNames() throws Exception {
		when(diagnosisService.diagnose(anyList())).thenReturn(diagnosis());
		MockMultipartFile front = new MockMultipartFile(
			"files",
			"front.jpg",
			"image/jpeg",
			"front".getBytes()
		);
		MockMultipartFile back = new MockMultipartFile(
			"files",
			"back.jpg",
			"image/jpeg",
			"back".getBytes()
		);

		mvc.perform(multipart("/api/contracts/diagnose").file(front).file(back))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.facts.weekly_working_hours").value(45.0))
			.andExpect(jsonPath("$.data.violations[0].rule_id").value("contract_period_review"))
			.andExpect(jsonPath("$.data.unverified_fields[0]").value("monthly_wage"));
	}

	@Test
	void returnsDiagnosisAndAiDocumentReviewForActiveSession() throws Exception {
		when(analysisService.analyze(anyString(), anyString(), anyList()))
			.thenReturn(analysisResponse());
		MockMultipartFile front = new MockMultipartFile(
			"files",
			"front.jpg",
			"image/jpeg",
			"front".getBytes()
		);

		mvc.perform(multipart("/api/contracts/analyze")
				.file(front)
				.param("sessionId", "session-001")
				.param("text", "계약서 문제를 설명해줘"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.requestId").value("request-001"))
			.andExpect(jsonPath("$.data.diagnosis.facts.monthly_wage").value(2_300_000))
			.andExpect(jsonPath("$.data.answer").value("계약기간을 확인하세요."))
			.andExpect(jsonPath("$.data.analysis.summary").value("계약기간 검토 필요"))
			.andExpect(jsonPath("$.data.userMessage.role").value("USER"))
			.andExpect(jsonPath("$.data.aiMessage.role").value("AI"));
	}

	@Test
	void returnsBadRequestWhenContractFilesAreMissing() throws Exception {
		mvc.perform(multipart("/api/contracts/analyze")
				.param("sessionId", "session-001")
				.param("text", "계약서 문제를 설명해줘"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
	}

	private ContractDiagnosis diagnosis() {
		ContractFacts facts = new ContractFacts(
			IndustryCategory.MANUFACTURING,
			45,
			8,
			60,
			1,
			2_300_000,
			11_005,
			true,
			true,
			true,
			48,
			true,
			false,
			80_000
		);
		RuleViolation violation = new RuleViolation(
			"contract_period_review",
			"외국인근로자의 고용 등에 관한 법률",
			"제18조의2",
			"연장허가 여부 확인이 필요합니다.",
			Severity.REVIEW
		);
		return new ContractDiagnosis(facts, List.of(violation), List.of("monthly_wage"));
	}

	private ContractAnalysisResponse analysisResponse() {
		return new ContractAnalysisResponse(
			"request-001",
			diagnosis(),
			"계약기간을 확인하세요.",
			new DocumentAnalysisResult.Analysis(
				"계약기간 검토 필요",
				List.of(),
				List.of("연장허가 여부를 확인합니다.")
			),
			new SessionMessage("user-message", MessageRole.USER, "계약서 문제를 설명해줘", Instant.EPOCH),
			new SessionMessage("ai-message", MessageRole.AI, "계약기간을 확인하세요.", Instant.EPOCH)
		);
	}
}
