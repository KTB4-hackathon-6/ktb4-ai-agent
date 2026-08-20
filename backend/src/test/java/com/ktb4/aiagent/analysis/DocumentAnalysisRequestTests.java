package com.ktb4.aiagent.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DocumentAnalysisRequestTests {

	@Test
	void mapsRestTimeNeedsReviewRuleToReviewCheck() {
		assertThat(DocumentAnalysisRequest.CheckId.fromRuleId("rest_time_needs_review"))
			.isEqualTo(DocumentAnalysisRequest.CheckId.REST_TIME_NEEDS_REVIEW);
	}
}
