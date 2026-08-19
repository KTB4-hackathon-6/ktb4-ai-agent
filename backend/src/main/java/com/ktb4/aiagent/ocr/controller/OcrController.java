package com.ktb4.aiagent.ocr.controller;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents/ocr")
@Tag(name = "문서 OCR", description = "계약서와 급여명세서 이미지에서 텍스트를 추출합니다.")
public class OcrController {

	private final OcrService ocrService;

	public OcrController(OcrService ocrService) {
		this.ocrService = ocrService;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(summary = "문서 OCR 분석", description = "이미지 파일과 문서 유형을 받아 OCR 분석 결과를 반환합니다.")
	public ApiResponse<OcrAnalysisResponse> extract(
			@Parameter(description = "분석할 이미지 파일", required = true)
			@RequestPart("image") MultipartFile image,
			@Parameter(description = "문서 유형: contract 또는 payslip", required = true)
			@RequestParam("documentType") String documentType) {
		OcrAnalysisResponse result = ocrService.analyze(image, documentType);
		return ApiResponse.success(result);
	}
}
