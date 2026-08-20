package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ContractDiagnosisServiceTests {

	@Test
	void runsOcrForEveryPageCombinesTextAndReturnsStructuredDiagnosis() {
		OcrService ocrService = mock(OcrService.class);
		ContractFactExtractor extractor = mock(ContractFactExtractor.class);
		MockMultipartFile front = file("front.jpg");
		MockMultipartFile back = file("back.jpg");
		when(ocrService.analyze(front))
			.thenReturn(new OcrAnalysisResponse(Instant.EPOCH, "앞면 OCR"));
		when(ocrService.analyze(back))
			.thenReturn(new OcrAnalysisResponse(Instant.EPOCH, "뒷면 OCR"));
		when(extractor.extract("앞면 OCR\n\n뒷면 OCR"))
			.thenReturn(new ContractExtraction(violatingFacts(), List.of("monthly_wage")));
		ContractDiagnosisService service = new ContractDiagnosisService(
			ocrService,
			extractor,
			new ContractRuleEngine()
		);

		ContractDiagnosisContext context = service.diagnoseWithContext(List.of(front, back));
		ContractDiagnosis result = context.diagnosis();

		verify(extractor).extract("앞면 OCR\n\n뒷면 OCR");
		assertThat(context.documents())
			.extracting(ContractDiagnosisContext.SourceDocument::fileName)
			.containsExactly("front.jpg", "back.jpg");
		assertThat(context.documents())
			.extracting(ContractDiagnosisContext.SourceDocument::text)
			.containsExactly("앞면 OCR", "뒷면 OCR");
		assertThat(result.facts().weeklyWorkingHours()).isEqualTo(60);
		assertThat(result.unverifiedFields()).containsExactly("monthly_wage");
		assertThat(result.violations())
			.extracting(violation -> violation.ruleId())
			.containsExactly("rest_time_insufficient");
	}

	private MockMultipartFile file(String name) {
		return new MockMultipartFile("files", name, "image/jpeg", "fake".getBytes());
	}

	private ContractFacts violatingFacts() {
		return new ContractFacts(
			IndustryCategory.MANUFACTURING,
			60,
			8,
			30,
			true,
			1,
			1_600_000,
			9_000,
			true,
			true,
			true,
			36,
			true,
			false,
			80_000
		);
	}
}
