package com.ktb4.aiagent.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

	INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않습니다."),
	INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),
	UNSUPPORTED_FILE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "지원하지 않는 파일 형식입니다."),
	FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일 크기가 허용 범위를 초과했습니다."),
	OCR_PROVIDER_REQUEST_ERROR(HttpStatus.BAD_GATEWAY, "OCR 처리 중 오류가 발생했습니다."),
	OCR_PROVIDER_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "OCR 서비스에 연결할 수 없습니다."),
	UNRELATED_DOCUMENT(HttpStatus.UNPROCESSABLE_CONTENT,
		"근로계약서 또는 급여명세서가 아닌 이미지입니다. 올바른 문서를 업로드해주세요."),
	CONTRACT_EXTRACTION_FAILED(HttpStatus.BAD_GATEWAY, "계약서 구조화에 실패했습니다."),
	SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "세션을 찾을 수 없습니다."),
	ANALYSIS_NOT_FOUND(HttpStatus.NOT_FOUND, "계약서 분석 작업을 찾을 수 없습니다."),
	ANALYSIS_BUSY(HttpStatus.SERVICE_UNAVAILABLE, "분석 요청이 많습니다. 잠시 후 다시 시도해주세요."),
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
