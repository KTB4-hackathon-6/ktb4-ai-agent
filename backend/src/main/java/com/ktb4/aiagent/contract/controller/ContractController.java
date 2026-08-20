package com.ktb4.aiagent.contract.controller;

import com.ktb4.aiagent.analysis.PreferredLanguage;
import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.service.ContractAnalysisService;
import com.ktb4.aiagent.contract.service.ContractDiagnosisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/contracts")
@Tag(name = "근로계약서 진단", description = "근로계약서 OCR, 구조화 및 규칙 기반 진단을 수행합니다.")
public class ContractController {

	private final ContractDiagnosisService diagnosisService;
	private final ContractAnalysisService analysisService;

	public ContractController(
			ContractDiagnosisService diagnosisService,
			ContractAnalysisService analysisService) {
		this.diagnosisService = diagnosisService;
		this.analysisService = analysisService;
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

	@PostMapping(path = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(
		summary = "근로계약서 OCR·진단 및 AI 검토",
		description = "OCR 원문과 규칙 진단 결과를 FastAPI 문서 검토 에이전트에 전달하고 상담 메시지를 저장합니다."
	)
	public ApiResponse<ContractAnalysisResponse> analyze(
			@Parameter(description = "TTL이 유효한 상담 세션 식별자", required = true)
			@RequestParam("sessionId") String sessionId,
			@Parameter(description = "계약서에 관해 사용자에게 답할 질문", required = true)
			@RequestParam("text") String text,
			@Parameter(description = "사용자 선호 언어 코드", example = "vi", required = true)
			@RequestParam("preferredLanguage") String preferredLanguage,
			@Parameter(description = "앞면·뒷면 등 근로계약서 페이지 파일", required = true)
			@RequestPart("files") List<MultipartFile> files) {
		return ApiResponse.success(analysisService.analyze(
			sessionId,
			text,
			PreferredLanguage.fromCode(preferredLanguage),
			files
		));
	}
}
