package com.ktb4.aiagent.common.web;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ApiResponseTests {

	@Test
	void successWrapsDataWithSuccessCode() {
		ApiResponse<String> response = ApiResponse.success("payload");

		assertEquals("SUCCESS", response.code());
		assertEquals("payload", response.data());
	}

	@Test
	void errorWrapsMessageInErrorData() {
		ApiResponse<ErrorData> response = ApiResponse.error("INVALID_REQUEST", "잘못된 요청입니다");

		assertEquals("INVALID_REQUEST", response.code());
		assertEquals("잘못된 요청입니다", response.data().message());
	}
}
