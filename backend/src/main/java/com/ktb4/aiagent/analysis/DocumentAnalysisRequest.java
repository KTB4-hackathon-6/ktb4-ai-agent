package com.ktb4.aiagent.analysis;

import java.util.List;
import java.util.Map;

public record DocumentAnalysisRequest(
	String requestId,
	String sessionId,
	String text,
	List<Document> documents,
	List<LegalCheck> legalChecks
) {
	public DocumentAnalysisRequest {
		documents = List.copyOf(documents);
		legalChecks = List.copyOf(legalChecks);
	}

	public List<String> documentIds() {
		return documents.stream().map(Document::documentId).toList();
	}

	public record Document(String documentId, String fileName, List<Page> pages) {
		public Document {
			pages = List.copyOf(pages);
		}
	}

	public record Page(int pageNumber, String text) {
	}

	public record LegalCheck(
		String checkId,
		LegalReference legalReference,
		CheckResult result,
		String reason,
		List<String> relatedDocumentIds,
		Map<String, Object> values
	) {
		public LegalCheck {
			relatedDocumentIds = List.copyOf(relatedDocumentIds);
			values = Map.copyOf(values);
		}
	}

	public record LegalReference(String lawName, String article, String paragraph, String item) {
	}

	public enum CheckResult {
		VIOLATION,
		POSSIBLE_VIOLATION,
		PASS,
		UNKNOWN
	}
}
