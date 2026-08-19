package com.ktb4.aiagent.session;

import com.ktb4.aiagent.common.web.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

	private final SessionService sessionService;

	public SessionController(SessionService sessionService) {
		this.sessionService = sessionService;
	}

	@PostMapping
	public ResponseEntity<ApiResponse<CreateSessionResponse>> createSession() {
		TemporarySession session = sessionService.createSession();
		CreateSessionResponse data = new CreateSessionResponse(session.sessionId());
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(data));
	}

	public record CreateSessionResponse(String sessionId) {
	}
}
