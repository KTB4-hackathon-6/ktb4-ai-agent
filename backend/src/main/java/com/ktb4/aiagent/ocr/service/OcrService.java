package com.ktb4.aiagent.ocr.service;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.ocr.client.ClovaOcrClient;
import com.ktb4.aiagent.ocr.client.ClovaTextJoiner;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrImageResult;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import java.io.IOException;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OcrService {

	private static final Logger log = LoggerFactory.getLogger(OcrService.class);

	private final OcrRequestValidator validator;
	private final ClovaOcrClient clovaOcrClient;

	public OcrService(OcrRequestValidator validator, ClovaOcrClient clovaOcrClient) {
		this.validator = validator;
		this.clovaOcrClient = clovaOcrClient;
	}

	public OcrAnalysisResponse analyze(MultipartFile image) {
		validator.validateFile(image);
		String format = resolveClovaFormat(image.getContentType());

		byte[] bytes;
		try {
			bytes = image.getBytes();
		} catch (IOException e) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}

		ClovaOcrResponse response = clovaOcrClient.recognize(bytes, format, "document", "ko");
		ClovaOcrImageResult result = firstResult(response);
		String fullText = ClovaTextJoiner.join(result.fields());

		return new OcrAnalysisResponse(Instant.now(), fullText);
	}

	private ClovaOcrImageResult firstResult(ClovaOcrResponse response) {
		if (response == null || response.images() == null || response.images().isEmpty()) {
			log.warn("Naver Clova OCR response had no images");
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_REQUEST_ERROR);
		}
		ClovaOcrImageResult result = response.images().get(0);
		if (result.fields() == null) {
			log.warn("Naver Clova OCR response had no recognized fields");
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_REQUEST_ERROR);
		}
		return result;
	}

	private String resolveClovaFormat(String contentType) {
		if (contentType == null) {
			throw new ApplicationException(ErrorCode.UNSUPPORTED_FILE_TYPE);
		}
		return switch (contentType) {
			case "image/jpeg" -> "jpg";
			case "image/png" -> "png";
			case "application/pdf" -> "pdf";
			default -> throw new ApplicationException(ErrorCode.UNSUPPORTED_FILE_TYPE);
		};
	}
}
