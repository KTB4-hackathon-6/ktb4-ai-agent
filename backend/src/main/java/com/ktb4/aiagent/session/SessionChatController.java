package com.ktb4.aiagent.session;

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
@RequestMapping("/api/sessions/{sessionId}/chat")
@Tag(name = "상담 채팅", description = "사용자 메시지를 분석하고 AI 답변을 저장합니다.")
public class SessionChatController {

	private final SessionChatService chatService;

	public SessionChatController(SessionChatService chatService) {
		this.chatService = chatService;
	}

	@PostMapping
	@Operation(summary = "상담 메시지 분석 및 AI 답변 생성")
	public ResponseEntity<ApiResponse<SessionChatService.ChatExchange>> chat(
		@Parameter(description = "상담 세션 식별자", example = "session-001")
		@PathVariable String sessionId,
		@RequestBody ChatRequest request
	) {
		SessionChatService.ChatExchange exchange = chatService.chat(
			sessionId,
			request.content(),
			request.preferredLanguage()
		);
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(exchange));
	}

	@Schema(description = "상담 채팅 요청")
	public record ChatRequest(
		@Schema(description = "사용자 메시지", example = "근로계약서를 확인하고 싶어요.", maxLength = 4000)
		String content,
		@Schema(description = "사용자 선호 언어 코드", example = "vi")
		PreferredLanguage preferredLanguage
	) {
	}
}
