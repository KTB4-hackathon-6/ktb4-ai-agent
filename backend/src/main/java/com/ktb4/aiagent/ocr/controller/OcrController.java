package com.ktb4.aiagent.ocr.controller;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents/ocr")
public class OcrController {

	private final OcrService ocrService;

	public OcrController(OcrService ocrService) {
		this.ocrService = ocrService;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ApiResponse<OcrAnalysisResponse> extract(
			@RequestPart("image") MultipartFile image,
			@RequestParam("documentType") String documentType) {
		OcrAnalysisResponse result = ocrService.analyze(image, documentType);
		return ApiResponse.success(result);
	}
}
