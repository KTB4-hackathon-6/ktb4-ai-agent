package com.ktb4.aiagent.analysis;

import java.util.List;

public record DocumentAnalysisResult(String answer, Analysis analysis) {

	public record Analysis(String summary, List<Finding> findings, List<String> nextActions) {
		public Analysis {
			findings = List.copyOf(findings);
			nextActions = List.copyOf(nextActions);
		}
	}

	public record Finding(
		String title,
		String description,
		String severity,
		List<String> relatedCheckIds,
		List<String> relatedDocumentIds
	) {
		public Finding {
			relatedCheckIds = List.copyOf(relatedCheckIds);
			relatedDocumentIds = List.copyOf(relatedDocumentIds);
		}
	}
}
