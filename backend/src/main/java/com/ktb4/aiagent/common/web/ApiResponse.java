package com.ktb4.aiagent.common.web;

import java.util.Map;
import java.util.Objects;

public record ApiResponse<T>(String code, T data) {

	private static final String SUCCESS_CODE = "SUCCESS";

	public ApiResponse {
		if (code == null || code.isBlank()) {
			throw new IllegalArgumentException("Response code must not be blank");
		}
		Objects.requireNonNull(data, "Response data must not be null");
		if (isJsonScalarOrArray(data)) {
			throw new IllegalArgumentException("Response data must be a JSON object");
		}
	}

	public static <T> ApiResponse<T> success(T data) {
		return new ApiResponse<>(SUCCESS_CODE, data);
	}

	public static ApiResponse<Map<String, Object>> success() {
		return success(Map.of());
	}

	public static <T> ApiResponse<T> error(String code, T data) {
		return new ApiResponse<>(code, data);
	}

	private static boolean isJsonScalarOrArray(Object data) {
		return data instanceof CharSequence
			|| data instanceof Number
			|| data instanceof Boolean
			|| data instanceof Character
			|| data instanceof Enum<?>
			|| data instanceof Iterable<?>
			|| data.getClass().isArray();
	}
}
