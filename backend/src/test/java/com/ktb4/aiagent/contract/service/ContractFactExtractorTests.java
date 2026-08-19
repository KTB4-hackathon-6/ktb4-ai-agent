package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.extraction.ContractFactExtractionClient;
import com.ktb4.aiagent.contract.extraction.ExtractedContractFacts;
import org.junit.jupiter.api.Test;

class ContractFactExtractorTests {

	private static final String OCR_TEXT = """
		근로시간 09시00분~18시00분(1일 8시간), 휴게 1일 60분
		근로계약기간 (36)개월, 주 45시간, 휴일 1일, 월급 2,300,000원, 숙박비 80,000원
		""";

	@Test
	void computesHourlyWageAndAcceptsValuesGroundedInOcrText() {
		ContractFactExtractor extractor = new ContractFactExtractor(clientReturning(validExtraction()));

		ContractExtraction result = extractor.extract(OCR_TEXT);

		assertThat(result.facts().hourlyWage()).isEqualTo(Math.round(2_300_000d / 209));
		assertThat(result.unverifiedFields()).isEmpty();
	}

	@Test
	void marksHallucinatedAndInternallyInconsistentValuesAsUnverified() {
		ExtractedContractFacts extracted = new ExtractedContractFacts(
			IndustryCategory.MANUFACTURING,
			0,
			8,
			99,
			1,
			2_300_000,
			true,
			true,
			true,
			36,
			true,
			false,
			80_000
		);
		ContractFactExtractor extractor = new ContractFactExtractor(clientReturning(extracted));

		ContractExtraction result = extractor.extract(OCR_TEXT);

		assertThat(result.unverifiedFields())
			.containsExactly("rest_minutes_per_workday", "weekly_working_hours");
	}

	@Test
	void acceptsRestTimeComposedFromHoursAndMinutesInOcrText() {
		ExtractedContractFacts extracted = new ExtractedContractFacts(
			IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY,
			0,
			0,
			90,
			1,
			0,
			false,
			true,
			true,
			24,
			true,
			false,
			0
		);
		ContractFactExtractor extractor = new ContractFactExtractor(clientReturning(extracted));

		ContractExtraction result = extractor.extract(
			"휴게시간 1일 (2)회, (1)시간 (30)분, 휴일 주1회, 계약기간 (24)개월");

		assertThat(result.unverifiedFields()).isEmpty();
	}

	private ContractFactExtractionClient clientReturning(ExtractedContractFacts facts) {
		return rawText -> facts;
	}

	private ExtractedContractFacts validExtraction() {
		return new ExtractedContractFacts(
			IndustryCategory.MANUFACTURING,
			45,
			8,
			60,
			1,
			2_300_000,
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
