package com.ktb4.aiagent.contract.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "OCR로 구조화한 근로조건과 규칙 기반 진단 결과")
public record ContractDiagnosis(
	ContractFacts facts,
	List<RuleViolation> violations,
	@Schema(description = "OCR 원문에서 추출 근거를 확인하지 못한 필드 이름")
	@JsonProperty("unverified_fields") List<String> unverifiedFields
) {
	public ContractDiagnosis {
		violations = List.copyOf(violations);
		unverifiedFields = List.copyOf(unverifiedFields);
	}
}
