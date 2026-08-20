package com.ktb4.aiagent.document;

import com.ktb4.aiagent.analysis.PreferredLanguage;
import com.ktb4.aiagent.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{sessionId}/documents")
@Tag(name = "진정서 작성", description = "AI가 구조화한 현재 데이터로 진정서 HWPX를 생성합니다.")
public class DocumentPreparationController {

	private final DocumentPreparationService documentPreparationService;

	public DocumentPreparationController(DocumentPreparationService documentPreparationService) {
		this.documentPreparationService = documentPreparationService;
	}

	@PostMapping
	@Operation(summary = "진정서 작성 및 현재 HWPX 생성")
	public ResponseEntity<ApiResponse<DocumentPreparationService.DocumentPreparationExchange>> prepare(
		@Parameter(description = "상담 세션 식별자", example = "session-001")
		@PathVariable String sessionId,
		@RequestBody PrepareDocumentRequest request
	) {
		DocumentPreparationService.DocumentPreparationExchange exchange =
			documentPreparationService.prepare(
				sessionId,
				request.content(),
				request.preferredLanguage()
			);
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(exchange));
	}

	@Schema(description = "진정서 작성 단계 입력")
	public record PrepareDocumentRequest(
		@Schema(
			description = "작성 시작 요청 또는 직전 누락 질문에 대한 답변",
			example = "진정서 작성을 시작해줘",
			maxLength = 4000
		)
		String content,
		@Schema(description = "사용자 선호 언어 코드", example = "vi")
		PreferredLanguage preferredLanguage
	) {
	}
}
