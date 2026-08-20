package com.ktb4.aiagent.payslip.controller;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.payslip.dto.PayslipDiagnosis;
import com.ktb4.aiagent.payslip.service.PayslipDiagnosisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/payslips")
@Tag(name = "급여명세서 진단", description = "급여명세서 OCR, 구조화 및 규칙 기반 진단을 수행합니다.")
public class PayslipController {

	private final PayslipDiagnosisService diagnosisService;

	public PayslipController(PayslipDiagnosisService diagnosisService) {
		this.diagnosisService = diagnosisService;
	}

	@PostMapping(path = "/diagnose", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(summary = "급여명세서 OCR 및 진단")
	public ApiResponse<PayslipDiagnosis> diagnose(
			@Parameter(description = "급여명세서 파일", required = true)
			@RequestPart("files") List<MultipartFile> files) {
		return ApiResponse.success(diagnosisService.diagnose(files));
	}
}
