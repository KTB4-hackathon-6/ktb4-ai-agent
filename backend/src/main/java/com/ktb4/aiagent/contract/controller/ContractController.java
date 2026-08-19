package com.ktb4.aiagent.contract.controller;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.service.ContractDiagnosisService;
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
@RequestMapping("/api/contracts")
@Tag(name = "근로계약서 진단", description = "근로계약서 OCR, 구조화 및 규칙 기반 진단을 수행합니다.")
public class ContractController {

	private final ContractDiagnosisService diagnosisService;

	public ContractController(ContractDiagnosisService diagnosisService) {
		this.diagnosisService = diagnosisService;
	}

	@PostMapping(path = "/diagnose", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(
		summary = "근로계약서 OCR 및 진단",
		description = "근로계약서 페이지 파일들을 OCR한 뒤 정보를 구조화하고 규칙 기반 진단 결과를 반환합니다."
	)
	public ApiResponse<ContractDiagnosis> diagnose(
			@Parameter(description = "앞면·뒷면 등 근로계약서 페이지 파일", required = true)
			@RequestPart("files") List<MultipartFile> files) {
		return ApiResponse.success(diagnosisService.diagnose(files));
	}
}
