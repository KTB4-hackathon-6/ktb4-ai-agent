package com.ktb4.aiagent.analysis;

@FunctionalInterface
public interface AnalysisClient {

	AnalysisOutcome review(
		String requestId,
		String sessionId,
		PreferredLanguage preferredLanguage,
		String content
	);

	default AnalysisOutcome reviewDocuments(DocumentAnalysisRequest request) {
		throw new UnsupportedOperationException("Document review is not supported");
	}

	default DocumentPreparationOutcome prepareDocuments(DocumentPreparationRequest request) {
		throw new UnsupportedOperationException("Document preparation is not supported");
	}

	default GuidanceOutcome guide(GuidanceRequest request) {
		throw new UnsupportedOperationException("Resolution guidance is not supported");
	}
}
