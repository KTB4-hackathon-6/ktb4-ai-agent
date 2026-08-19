package com.ktb4.aiagent.session;

import com.ktb4.aiagent.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{sessionId}/messages")
@Tag(name = "상담 메시지", description = "상담 세션에 저장된 메시지를 조회합니다.")
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

	@Schema(description = "상담 메시지 목록")
	public record MessagesResponse(List<SessionMessage> messages) {

		public MessagesResponse {
			messages = List.copyOf(messages);
		}
	}
}
