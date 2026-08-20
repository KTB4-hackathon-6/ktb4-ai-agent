package com.ktb4.aiagent.contract.dto;

import com.ktb4.aiagent.analysis.AnalysisOutcome;
import com.ktb4.aiagent.session.SessionMessage;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "계약서 규칙 진단과 AI 문서 검토 결과")
public record ContractAnalysisResponse(
	@Schema(description = "FastAPI 분석 요청 식별자") String requestId,
	ContractDiagnosis diagnosis,
	@Schema(description = "사용자에게 보여줄 AI 답변") String answer,
	AnalysisOutcome.Analysis analysis,
	SessionMessage userMessage,
	SessionMessage aiMessage
) {
}
