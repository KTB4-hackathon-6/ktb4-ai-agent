package com.ktb4.aiagent.document;

import java.time.Instant;
import java.util.Objects;

public record GeneratedDocument(
	String documentId,
	String templateId,
	String templateVersion,
	String fileName,
	String mimeType,
	Instant generatedAt,
	byte[] bytes,
	Status status
) {

	public GeneratedDocument {
		documentId = Objects.requireNonNull(documentId, "Document ID must not be null");
		templateId = Objects.requireNonNull(templateId, "Template ID must not be null");
		templateVersion = Objects.requireNonNull(templateVersion, "Template version must not be null");
		fileName = Objects.requireNonNull(fileName, "File name must not be null");
		mimeType = Objects.requireNonNull(mimeType, "MIME type must not be null");
		generatedAt = Objects.requireNonNull(generatedAt, "Generated time must not be null");
		bytes = Objects.requireNonNull(bytes, "Document bytes must not be null").clone();
		status = Objects.requireNonNull(status, "Generation status must not be null");
	}

	@Override
	public byte[] bytes() {
		return bytes.clone();
	}

	public enum Status {
		GENERATED
	}
}
