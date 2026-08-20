package com.ktb4.aiagent.document;

import com.ktb4.aiagent.analysis.AnalysisOutcome;
import java.util.List;
import java.util.Objects;

public record DocumentGenerationResult(
	Status status,
	GeneratedDocument document,
	List<AnalysisOutcome.MissingField> missingFields
) {

	public DocumentGenerationResult {
		status = Objects.requireNonNull(status, "Generation result status must not be null");
		missingFields = List.copyOf(Objects.requireNonNull(missingFields, "Missing fields must not be null"));
		if (status == Status.GENERATED && document == null) {
			throw new IllegalArgumentException("GENERATED requires a document");
		}
		if (status == Status.GENERATED && !missingFields.isEmpty()) {
			throw new IllegalArgumentException("GENERATED forbids missing fields");
		}
		if (status == Status.NEEDS_INPUT && document != null) {
			throw new IllegalArgumentException("NEEDS_INPUT forbids a document");
		}
		if (status == Status.NEEDS_INPUT && missingFields.isEmpty()) {
			throw new IllegalArgumentException("NEEDS_INPUT requires missing fields");
		}
	}

	public static DocumentGenerationResult generated(GeneratedDocument document) {
		return new DocumentGenerationResult(Status.GENERATED, document, List.of());
	}

	public static DocumentGenerationResult needsInput(
		List<AnalysisOutcome.MissingField> missingFields
	) {
		return new DocumentGenerationResult(Status.NEEDS_INPUT, null, missingFields);
	}

	public enum Status {
		GENERATED,
		NEEDS_INPUT
	}
}
