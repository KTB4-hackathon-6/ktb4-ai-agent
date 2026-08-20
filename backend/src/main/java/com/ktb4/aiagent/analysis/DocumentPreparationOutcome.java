package com.ktb4.aiagent.analysis;

import java.util.List;

public record DocumentPreparationOutcome(
	String answer,
	List<AnalysisOutcome.DocumentDraft> documentDrafts
) {
	public DocumentPreparationOutcome {
		if (answer == null || answer.isBlank()) {
			throw new IllegalArgumentException("Answer must not be blank");
		}
		documentDrafts = List.copyOf(documentDrafts);
		if (documentDrafts.size() != 1) {
			throw new IllegalArgumentException("Document preparation requires exactly one draft");
		}
	}
}
