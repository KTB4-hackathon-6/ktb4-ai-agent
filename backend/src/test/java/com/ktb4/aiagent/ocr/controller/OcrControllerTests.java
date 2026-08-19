package com.ktb4.aiagent.ocr.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrService;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(OcrController.class)
class OcrControllerTests {

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private OcrService ocrService;

	private static MockMultipartFile imagePart() {
		return new MockMultipartFile("image", "a.jpg", "image/jpeg", "bytes".getBytes());
	}

	@Test
	void returnsSuccessEnvelopeForValidRequest() {
		when(ocrService.analyze(any()))
			.thenReturn(new OcrAnalysisResponse(Instant.parse("2026-08-19T10:00:00Z"), "임금 2,000,000원"));

		mvc.perform(multipart("/api/documents/ocr").file(imagePart()))
			.assertThat()
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.code").isEqualTo("SUCCESS");
	}

	@Test
	void returnsUnsupportedMediaTypeErrorEnvelope() {
		when(ocrService.analyze(any()))
			.thenThrow(new ApplicationException(ErrorCode.UNSUPPORTED_FILE_TYPE));

		mvc.perform(multipart("/api/documents/ocr").file(imagePart()))
			.assertThat()
			.hasStatus(415)
			.bodyJson()
			.extractingPath("$.code").isEqualTo("UNSUPPORTED_FILE_TYPE");
	}

	@Test
	void returnsBadGatewayErrorEnvelopeForClovaClientError() {
		when(ocrService.analyze(any()))
			.thenThrow(new ApplicationException(ErrorCode.OCR_PROVIDER_REQUEST_ERROR));

		mvc.perform(multipart("/api/documents/ocr").file(imagePart()))
			.assertThat()
			.hasStatus(502)
			.bodyJson()
			.extractingPath("$.code").isEqualTo("OCR_PROVIDER_REQUEST_ERROR");
	}

	@Test
	void returnsGatewayTimeoutErrorEnvelopeForClovaUnavailable() {
		when(ocrService.analyze(any()))
			.thenThrow(new ApplicationException(ErrorCode.OCR_PROVIDER_TIMEOUT));

		mvc.perform(multipart("/api/documents/ocr").file(imagePart()))
			.assertThat()
			.hasStatus(504)
			.bodyJson()
			.extractingPath("$.code").isEqualTo("OCR_PROVIDER_TIMEOUT");
	}
}
