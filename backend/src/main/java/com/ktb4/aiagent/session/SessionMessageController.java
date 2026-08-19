package com.ktb4.aiagent.session;

import com.ktb4.aiagent.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "상담 메시지", description = "상담 세션의 메시지를 조회하고 추가합니다.")
public class SessionMessageController {

	private final SessionMessageService messageService;

	public SessionMessageController(SessionMessageService messageService) {
		this.messageService = messageService;
	}

	@GetMapping
	@Operation(summary = "상담 메시지 목록 조회")
	public ApiResponse<MessagesResponse> getMessages(@PathVariable String sessionId) {
		return ApiResponse.success(new MessagesResponse(messageService.getMessages(sessionId)));
	}

	@PostMapping
	@Operation(summary = "사용자 상담 메시지 추가")
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

	@Schema(description = "사용자 상담 메시지 추가 요청")
	public record AddMessageRequest(
		@Schema(description = "메시지 내용", example = "근로계약서를 확인하고 싶어요.") String content
	) {
	}

	@Schema(description = "상담 메시지 목록")
	public record MessagesResponse(List<SessionMessage> messages) {

		public MessagesResponse {
			messages = List.copyOf(messages);
		}
	}
}
