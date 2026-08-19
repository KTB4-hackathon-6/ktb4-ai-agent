package com.ktb4.aiagent.ocr.exception;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.common.web.ErrorData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(InvalidRequestException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleInvalidRequest(InvalidRequestException e) {
		return respond(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", e.getMessage());
	}

	@ExceptionHandler(MissingServletRequestPartException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleMissingPart(MissingServletRequestPartException e) {
		return respond(HttpStatus.BAD_REQUEST, "INVALID_REQUEST",
			"필수 요청 파트가 누락되었습니다: " + e.getRequestPartName());
	}

	@ExceptionHandler(UnsupportedFileTypeException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleUnsupportedFileType(UnsupportedFileTypeException e) {
		return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_FILE_TYPE", e.getMessage());
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleFileTooLarge(MaxUploadSizeExceededException e) {
		return respond(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE", "파일 크기가 허용 범위를 초과했습니다");
	}

	@ExceptionHandler(InvalidDocumentTypeException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleInvalidDocumentType(InvalidDocumentTypeException e) {
		return respond(HttpStatus.BAD_REQUEST, "INVALID_DOCUMENT_TYPE", e.getMessage());
	}

	@ExceptionHandler(ClovaOcrClientException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleClovaClientError(ClovaOcrClientException e) {
		log.warn("Clova OCR request error", e);
		return respond(HttpStatus.BAD_GATEWAY, "OCR_PROVIDER_REQUEST_ERROR", "OCR 처리 중 오류가 발생했습니다");
	}

	@ExceptionHandler(ClovaOcrUnavailableException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleClovaUnavailable(ClovaOcrUnavailableException e) {
		log.warn("Clova OCR unavailable", e);
		return respond(HttpStatus.GATEWAY_TIMEOUT, "OCR_PROVIDER_TIMEOUT", "OCR 서비스에 연결할 수 없습니다");
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleUnexpected(Exception e) {
		log.error("Unexpected error handling OCR request", e);
		return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "예기치 못한 오류가 발생했습니다");
	}

	private ResponseEntity<ApiResponse<ErrorData>> respond(HttpStatus status, String code, String message) {
		return ResponseEntity.status(status).body(ApiResponse.error(code, message));
	}
}
