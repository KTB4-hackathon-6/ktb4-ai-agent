package com.ktb4.aiagent.ocr.service;

import com.ktb4.aiagent.ocr.client.ClovaOcrClient;
import com.ktb4.aiagent.ocr.client.ClovaTextJoiner;
import com.ktb4.aiagent.ocr.dto.DocumentType;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrImageResult;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import com.ktb4.aiagent.ocr.exception.ClovaOcrClientException;
import com.ktb4.aiagent.ocr.exception.InvalidRequestException;
import com.ktb4.aiagent.ocr.exception.UnsupportedFileTypeException;
import java.io.IOException;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OcrService {

	private final OcrRequestValidator validator;
	private final ClovaOcrClient clovaOcrClient;

	public OcrService(OcrRequestValidator validator, ClovaOcrClient clovaOcrClient) {
		this.validator = validator;
		this.clovaOcrClient = clovaOcrClient;
	}

	public OcrAnalysisResponse analyze(MultipartFile image, String rawDocumentType) {
		validator.validateFile(image);
		DocumentType documentType = validator.validateDocumentType(rawDocumentType);
		String format = resolveClovaFormat(image.getContentType());

		byte[] bytes;
		try {
			bytes = image.getBytes();
		} catch (IOException e) {
			throw new InvalidRequestException("파일을 읽을 수 없습니다");
		}

		ClovaOcrResponse response = clovaOcrClient.recognize(bytes, format, "document", "ko");
		ClovaOcrImageResult result = firstResult(response);
		String fullText = ClovaTextJoiner.join(result.fields());

		return new OcrAnalysisResponse(documentType.toValue(), Instant.now(), fullText);
	}

	private ClovaOcrImageResult firstResult(ClovaOcrResponse response) {
		if (response == null || response.images() == null || response.images().isEmpty()) {
			throw new ClovaOcrClientException("Naver Clova OCR 응답이 비어 있습니다");
		}
		ClovaOcrImageResult result = response.images().get(0);
		if (result.fields() == null) {
			throw new ClovaOcrClientException("Naver Clova OCR 응답에 인식 결과가 없습니다");
		}
		return result;
	}

	private String resolveClovaFormat(String contentType) {
		if (contentType == null) {
			throw new UnsupportedFileTypeException("지원하지 않는 파일 형식입니다: null");
		}
		return switch (contentType) {
			case "image/jpeg" -> "jpg";
			case "image/png" -> "png";
			case "application/pdf" -> "pdf";
			default -> throw new UnsupportedFileTypeException("지원하지 않는 파일 형식입니다: " + contentType);
		};
	}
}
