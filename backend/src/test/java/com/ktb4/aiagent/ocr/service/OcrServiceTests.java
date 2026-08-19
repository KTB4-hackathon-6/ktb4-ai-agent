package com.ktb4.aiagent.ocr.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.ocr.client.ClovaOcrClient;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrField;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrImageResult;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class OcrServiceTests {

	@Mock
	private ClovaOcrClient clovaOcrClient;

	private OcrService ocrService;

	@BeforeEach
	void setUp() {
		ocrService = new OcrService(new OcrRequestValidator(), clovaOcrClient);
	}

	@Test
	void analyzeReturnsJoinedText() {
		MockMultipartFile file = new MockMultipartFile("image", "a.jpg", "image/jpeg", "bytes".getBytes());
		ClovaOcrResponse response = new ClovaOcrResponse(List.of(
			new ClovaOcrImageResult("SUCCESS", null, List.of(
				new ClovaOcrField("임금", false),
				new ClovaOcrField("2,000,000원", true)
			))
		));
		when(clovaOcrClient.recognize(any(), eq("jpg"), any(), eq("ko"))).thenReturn(response);

		OcrAnalysisResponse result = ocrService.analyze(file);

		assertThat(result.fullText()).isEqualTo("임금 2,000,000원");
		verify(clovaOcrClient).recognize(any(), eq("jpg"), any(), eq("ko"));
	}

	@Test
	void analyzeRejectsUnsupportedContentTypeBeforeCallingClova() {
		MockMultipartFile file = new MockMultipartFile("image", "a.gif", "image/gif", "bytes".getBytes());

		ApplicationException exception = assertThrows(ApplicationException.class,
			() -> ocrService.analyze(file));
		assertThat(exception.errorCode()).isEqualTo(ErrorCode.UNSUPPORTED_FILE_TYPE);
	}

	@Test
	void analyzeWrapsEmptyClovaResponseAsClientException() {
		MockMultipartFile file = new MockMultipartFile("image", "a.png", "image/png", "bytes".getBytes());
		when(clovaOcrClient.recognize(any(), eq("png"), any(), eq("ko")))
			.thenReturn(new ClovaOcrResponse(List.of()));

		ApplicationException exception = assertThrows(ApplicationException.class,
			() -> ocrService.analyze(file));
		assertThat(exception.errorCode()).isEqualTo(ErrorCode.OCR_PROVIDER_REQUEST_ERROR);
	}
}
