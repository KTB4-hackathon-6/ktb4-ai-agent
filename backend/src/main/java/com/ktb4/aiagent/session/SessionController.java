package com.ktb4.aiagent.session;

import com.ktb4.aiagent.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions")
@Tag(name = "상담 세션", description = "임시 상담 세션을 생성합니다.")
public class SessionController {

	private final SessionService sessionService;

	public SessionController(SessionService sessionService) {
		this.sessionService = sessionService;
	}

	@PostMapping
	@Operation(summary = "임시 상담 세션 생성")
	public ResponseEntity<ApiResponse<CreateSessionResponse>> createSession() {
		TemporarySession session = sessionService.createSession();
		CreateSessionResponse data = new CreateSessionResponse(session.sessionId());
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data));
	}

	@Schema(description = "생성된 임시 상담 세션")
	public record CreateSessionResponse(
		@Schema(description = "세션 식별자", example = "session-001") String sessionId
	) {
	}
}
