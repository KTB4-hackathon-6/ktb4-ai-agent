package com.ktb4.aiagent.ocr.service;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class OcrRequestValidator {

	private static final Logger log = LoggerFactory.getLogger(OcrRequestValidator.class);

	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
		"application/pdf",
		"image/jpeg",
		"image/png"
	);

	public void validateFile(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		String contentType = file.getContentType();
		if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
			log.warn("Unsupported OCR upload content type: {}", contentType);
			throw new ApplicationException(ErrorCode.UNSUPPORTED_FILE_TYPE);
		}
	}

}
