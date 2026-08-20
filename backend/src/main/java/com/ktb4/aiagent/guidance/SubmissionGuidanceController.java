package com.ktb4.aiagent.guidance;

import com.ktb4.aiagent.analysis.GuidanceOutcome;
import com.ktb4.aiagent.analysis.PreferredLanguage;
import com.ktb4.aiagent.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{sessionId}/guidance")
@Tag(name = "제출 안내", description = "완성된 진정서의 관할 기관과 제출 방법을 안내합니다.")
public class SubmissionGuidanceController {

	private final SubmissionGuidanceService guidanceService;

	public SubmissionGuidanceController(SubmissionGuidanceService guidanceService) {
		this.guidanceService = guidanceService;
	}

	@PostMapping
	@Operation(summary = "완성된 진정서 제출 방법 안내")
	public ResponseEntity<ApiResponse<GuidanceOutcome>> guide(
		@Parameter(description = "상담 세션 식별자", example = "session-001")
		@PathVariable String sessionId,
		@RequestBody SubmissionGuidanceRequest request
	) {
		GuidanceOutcome outcome = guidanceService.guide(
			sessionId,
			request.content(),
			request.preferredLanguage()
		);
		return ResponseEntity.ok(ApiResponse.success(outcome));
	}

	@Schema(description = "진정서 제출 방법 안내 요청")
	public record SubmissionGuidanceRequest(
		@Schema(
			description = "제출 방법에 관한 사용자 요청",
			example = "완성한 진정서를 어디에 제출해야 해?",
			maxLength = 4000
		)
		String content,
		@Schema(description = "사용자 선호 언어 코드", example = "vi")
		PreferredLanguage preferredLanguage
	) {
	}
}
