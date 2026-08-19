package com.ktb4.aiagent.session;

import com.ktb4.aiagent.common.web.ApiResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{sessionId}/messages")
public class SessionMessageController {

	private final SessionMessageService messageService;

	public SessionMessageController(SessionMessageService messageService) {
		this.messageService = messageService;
	}

	@GetMapping
	public ApiResponse<MessagesResponse> getMessages(@PathVariable String sessionId) {
		return ApiResponse.success(new MessagesResponse(messageService.getMessages(sessionId)));
	}

	@PostMapping
	public ResponseEntity<ApiResponse<SessionMessage>> addMessage(
		@PathVariable String sessionId,
		@RequestBody AddMessageRequest request
	) {
		SessionMessage message = messageService.addUserMessage(
			sessionId,
			request.content()
		);
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(message));
	}

	public record AddMessageRequest(String content) {
	}

	public record MessagesResponse(List<SessionMessage> messages) {

		public MessagesResponse {
			messages = List.copyOf(messages);
		}
	}
}
