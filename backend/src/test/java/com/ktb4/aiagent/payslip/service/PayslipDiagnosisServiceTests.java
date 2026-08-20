package com.ktb4.aiagent.payslip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrService;
import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class PayslipDiagnosisServiceTests {

	@Test
	void suppressesRuleFindingsWhoseExtractionEvidenceIsUnverified() {
		OcrService ocrService = org.mockito.Mockito.mock(OcrService.class);
		PayslipFactExtractor factExtractor = org.mockito.Mockito.mock(PayslipFactExtractor.class);
		PayslipRuleEngine ruleEngine = new PayslipRuleEngine();
		PayslipDiagnosisService service = new PayslipDiagnosisService(ocrService, factExtractor, ruleEngine);
		MockMultipartFile file = new MockMultipartFile("files", "payslip.jpg", "image/jpeg", "image".getBytes());
		when(ocrService.analyzeAll(anyList()))
			.thenReturn(List.of(new OcrAnalysisResponse(Instant.EPOCH, "OCR 원문")));
		when(factExtractor.extract("OCR 원문")).thenReturn(new PayslipExtraction(
			new PayslipFacts(true, true, true, true, true, 2_000_000, 209,
				0, 0, 0, 0, 2_000_000, 0, 2_000_000, 0),
			List.of("regular_working_hours")
		));

		var diagnosis = service.diagnose(List.of(file));

		assertThat(diagnosis.violations()).extracting(violation -> violation.ruleId())
			.doesNotContain("payslip_below_minimum_wage");
		assertThat(diagnosis.unverifiedFields()).containsExactly("regular_working_hours");
	}
}
