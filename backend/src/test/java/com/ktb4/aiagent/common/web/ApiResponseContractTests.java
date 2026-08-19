package com.ktb4.aiagent.common.web;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

public class ApiResponseContractTests {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void returnsSuccessWithOnlyCodeAndObjectData() throws Exception {
		mockMvc.perform(get("/test/success"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data.sessionId").value("session-001"));
	}

	@Test
	void returnsEmptyObjectWhenSuccessHasNoData() throws Exception {
		mockMvc.perform(get("/test/success-without-data"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("SUCCESS"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data").isEmpty());
	}

	@Test
	void handlesApplicationExceptionWithCommonErrorResponse() throws Exception {
		mockMvc.perform(get("/test/application-error"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data.message").value("요청 형식이 올바르지 않습니다."));
	}

	@Test
	void hidesInternalDetailsForUnhandledException() throws Exception {
		mockMvc.perform(get("/test/unhandled-error"))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.*", hasSize(2)))
			.andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
			.andExpect(jsonPath("$.data").isMap())
			.andExpect(jsonPath("$.data.message").value("서버 내부 오류가 발생했습니다."))
			.andExpect(content().string(not(containsString("database-password"))));
	}

	@RestController
	@RequestMapping("/test")
	public static class TestController {

		@GetMapping("/success")
		public ApiResponse<SessionData> success() {
			return ApiResponse.success(new SessionData("session-001"));
		}

		@GetMapping("/success-without-data")
		public ApiResponse<?> successWithoutData() {
			return ApiResponse.success();
		}

		@GetMapping("/application-error")
		public void applicationError() {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}

		@GetMapping("/unhandled-error")
		public void unhandledError() {
			throw new IllegalStateException("database-password");
		}
	}

	public record SessionData(String sessionId) {
	}
}
