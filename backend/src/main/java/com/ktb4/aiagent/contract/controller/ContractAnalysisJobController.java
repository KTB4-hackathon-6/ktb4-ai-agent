package com.ktb4.aiagent.contract.controller;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.contract.dto.ContractAnalysisJobResponse;
import com.ktb4.aiagent.contract.service.ContractAnalysisJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/sessions/{sessionId}/contract-analyses")
@Tag(name = "근로계약서 분석 작업", description = "계약서 분석을 시작하고 실제 처리 단계를 조회합니다.")
public class ContractAnalysisJobController {

	private final ContractAnalysisJobService jobService;

	public ContractAnalysisJobController(ContractAnalysisJobService jobService) {
		this.jobService = jobService;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(summary = "비동기 근로계약서 분석 시작")
	public ResponseEntity<ApiResponse<ContractAnalysisJobResponse>> start(
			@PathVariable String sessionId,
			@Parameter(description = "계약서에 관해 사용자에게 답할 질문", required = true)
			@RequestParam("text") String text,
			@Parameter(description = "근로계약서 PDF 또는 이미지 파일", required = true)
			@RequestPart("files") List<MultipartFile> files) {
		ContractAnalysisJobResponse job = jobService.start(sessionId, text, files);
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.success(job));
	}

	@GetMapping("/{analysisId}")
	@Operation(summary = "근로계약서 분석 진행 상태 조회")
	public ApiResponse<ContractAnalysisJobResponse> get(
			@PathVariable String sessionId,
			@PathVariable String analysisId) {
		return ApiResponse.success(jobService.get(sessionId, analysisId));
	}
}
