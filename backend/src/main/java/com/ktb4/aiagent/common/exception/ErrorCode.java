package com.ktb4.aiagent.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

	INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않습니다."),
	INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),
	UNSUPPORTED_FILE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "지원하지 않는 파일 형식입니다."),
	FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일 크기가 허용 범위를 초과했습니다."),
	INVALID_DOCUMENT_TYPE(HttpStatus.BAD_REQUEST, "지원하지 않는 documentType입니다."),
	OCR_PROVIDER_REQUEST_ERROR(HttpStatus.BAD_GATEWAY, "OCR 처리 중 오류가 발생했습니다."),
	OCR_PROVIDER_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "OCR 서비스에 연결할 수 없습니다."),
	SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "세션을 찾을 수 없습니다."),
	AI_REQUEST_FAILED(HttpStatus.BAD_GATEWAY, "AI 서비스 요청에 실패했습니다.");

	private final HttpStatus httpStatus;
	private final String message;

	ErrorCode(HttpStatus httpStatus, String message) {
		this.httpStatus = httpStatus;
		this.message = message;
	}

	public String code() {
		return name();
	}

	public HttpStatus httpStatus() {
		return httpStatus;
	}

	public String message() {
		return message;
	}
}
