package com.ktb4.aiagent.ocr.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
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

		ApplicationException exception = assertThrows(ApplicationException.class, () -> validator.validateFile(file));
		assertEquals(ErrorCode.UNSUPPORTED_FILE_TYPE, exception.errorCode());
	}

	@Test
	void rejectsEmptyFile() {
		MockMultipartFile file = new MockMultipartFile("image", "a.pdf", "application/pdf", new byte[0]);

		ApplicationException exception = assertThrows(ApplicationException.class, () -> validator.validateFile(file));
		assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode());
	}

}
