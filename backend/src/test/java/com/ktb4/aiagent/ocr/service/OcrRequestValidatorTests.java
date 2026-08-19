package com.ktb4.aiagent.ocr.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ktb4.aiagent.ocr.dto.DocumentType;
import com.ktb4.aiagent.ocr.exception.InvalidDocumentTypeException;
import com.ktb4.aiagent.ocr.exception.InvalidRequestException;
import com.ktb4.aiagent.ocr.exception.UnsupportedFileTypeException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class OcrRequestValidatorTests {

	private final OcrRequestValidator validator = new OcrRequestValidator();

	@Test
	void acceptsAllowedContentTypes() {
		validator.validateFile(new MockMultipartFile("image", "a.pdf", "application/pdf", new byte[] {1}));
		validator.validateFile(new MockMultipartFile("image", "a.jpg", "image/jpeg", new byte[] {1}));
		validator.validateFile(new MockMultipartFile("image", "a.png", "image/png", new byte[] {1}));
	}

	@Test
	void rejectsUnsupportedContentType() {
		MockMultipartFile file = new MockMultipartFile("image", "a.gif", "image/gif", new byte[] {1});

		assertThrows(UnsupportedFileTypeException.class, () -> validator.validateFile(file));
	}

	@Test
	void rejectsEmptyFile() {
		MockMultipartFile file = new MockMultipartFile("image", "a.pdf", "application/pdf", new byte[0]);

		assertThrows(InvalidRequestException.class, () -> validator.validateFile(file));
	}

	@Test
	void normalizesDocumentTypeCaseAndWhitespace() {
		assertEquals(DocumentType.CONTRACT, validator.validateDocumentType(" Contract "));
		assertEquals(DocumentType.PAYSLIP, validator.validateDocumentType("PAYSLIP"));
	}

	@Test
	void rejectsUnknownDocumentType() {
		assertThrows(InvalidDocumentTypeException.class, () -> validator.validateDocumentType("invoice"));
	}

	@Test
	void rejectsBlankDocumentType() {
		assertThrows(InvalidDocumentTypeException.class, () -> validator.validateDocumentType("  "));
	}
}
