package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.IntConsumer;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ContractDiagnosisServiceTests {

	@Test
	void runsOcrForEveryPageCombinesTextAndReturnsStructuredDiagnosis() {
		OcrService ocrService = mock(OcrService.class);
		ContractFactExtractor extractor = mock(ContractFactExtractor.class);
		MockMultipartFile front = file("front.jpg");
		MockMultipartFile back = file("back.jpg");
		when(ocrService.analyzeAll(eq(List.of(front, back)), any())).thenAnswer(invocation -> {
			IntConsumer progressListener = invocation.getArgument(1);
			progressListener.accept(1);
			progressListener.accept(2);
			return List.of(
				new OcrAnalysisResponse(Instant.EPOCH, "앞면 OCR"),
				new OcrAnalysisResponse(Instant.EPOCH, "뒷면 OCR")
			);
		});
		when(extractor.extract("앞면 OCR\n\n뒷면 OCR"))
			.thenReturn(new ContractExtraction(violatingFacts(), List.of("monthly_wage")));
		ContractDiagnosisService service = new ContractDiagnosisService(
			ocrService,
			extractor,
			new ContractRuleEngine()
		);

		List<String> progressEvents = new ArrayList<>();
		ContractAnalysisProgressListener listener = new ContractAnalysisProgressListener() {
			@Override
			public void onOcrProgress(int processedFiles, int totalFiles) {
				progressEvents.add("OCR:" + processedFiles + "/" + totalFiles);
			}

			@Override
			public void onStructuring() {
				progressEvents.add("STRUCTURING");
			}
		};
		ContractDiagnosisContext context = service.diagnoseWithContext(List.of(front, back), listener);
		ContractDiagnosis result = context.diagnosis();

		verify(extractor).extract("앞면 OCR\n\n뒷면 OCR");
		assertThat(context.documents())
			.extracting(ContractDiagnosisContext.SourceDocument::fileName)
			.containsExactly("front.jpg", "back.jpg");
		assertThat(context.documents())
			.extracting(ContractDiagnosisContext.SourceDocument::text)
			.containsExactly("앞면 OCR", "뒷면 OCR");
		assertThat(progressEvents).containsExactly("OCR:1/2", "OCR:2/2", "STRUCTURING");
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
