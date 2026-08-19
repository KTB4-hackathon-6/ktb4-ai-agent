package com.ktb4.aiagent.ocr.service;

import com.ktb4.aiagent.ocr.dto.DocumentType;
import com.ktb4.aiagent.ocr.exception.InvalidDocumentTypeException;
import com.ktb4.aiagent.ocr.exception.InvalidRequestException;
import com.ktb4.aiagent.ocr.exception.UnsupportedFileTypeException;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class OcrRequestValidator {

	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
		"application/pdf",
		"image/jpeg",
		"image/png"
	);

	public void validateFile(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new InvalidRequestException("image 파일이 필요합니다");
		}
		String contentType = file.getContentType();
		if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
			throw new UnsupportedFileTypeException("지원하지 않는 파일 형식입니다: " + contentType);
		}
	}

	public DocumentType validateDocumentType(String rawDocumentType) {
		if (rawDocumentType == null || rawDocumentType.isBlank()) {
			throw new InvalidDocumentTypeException("documentType이 필요합니다");
		}
		String normalized = rawDocumentType.trim().toUpperCase(Locale.ROOT);
		try {
			return DocumentType.valueOf(normalized);
		} catch (IllegalArgumentException e) {
			throw new InvalidDocumentTypeException("지원하지 않는 documentType입니다: " + rawDocumentType);
		}
	}
}
