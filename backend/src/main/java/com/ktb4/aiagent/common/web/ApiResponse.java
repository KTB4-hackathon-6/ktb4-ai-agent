package com.ktb4.aiagent.common.web;

public record ApiResponse<T>(String code, T data) {

	public static final String SUCCESS_CODE = "SUCCESS";

	public static <T> ApiResponse<T> success(T data) {
		return new ApiResponse<>(SUCCESS_CODE, data);
	}

	public static ApiResponse<ErrorData> error(String code, String message) {
		return new ApiResponse<>(code, new ErrorData(message));
	}
}
