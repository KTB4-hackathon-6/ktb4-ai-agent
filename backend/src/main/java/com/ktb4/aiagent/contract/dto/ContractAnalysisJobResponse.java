package com.ktb4.aiagent.contract.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "비동기 계약서 분석 작업 상태")
public record ContractAnalysisJobResponse(
	String analysisId,
	Status status,
	Stage stage,
	int processedFiles,
	int totalFiles,
	ContractAnalysisResponse result,
	JobError error
) {
	public enum Status {
		PROCESSING,
		COMPLETED,
		FAILED
	}

	public enum Stage {
		OCR,
		STRUCTURING,
		GENERATING_RESPONSE,
		COMPLETED
	}

	public record JobError(String code, String message) {
	}
}
