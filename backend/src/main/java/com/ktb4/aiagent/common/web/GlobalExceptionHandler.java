package com.ktb4.aiagent.common.web;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApplicationException.class)
	ResponseEntity<ApiResponse<ErrorData>> handleApplicationException(ApplicationException exception) {
		return errorResponse(exception.errorCode());
	}

	@ExceptionHandler({
		MethodArgumentNotValidException.class,
		HttpMessageNotReadableException.class,
		MissingServletRequestParameterException.class,
		MissingServletRequestPartException.class
	})
	ResponseEntity<ApiResponse<ErrorData>> handleInvalidRequest(Exception exception) {
		return errorResponse(ErrorCode.INVALID_REQUEST);
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<ApiResponse<ErrorData>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException exception) {
		return errorResponse(ErrorCode.FILE_TOO_LARGE);
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ApiResponse<ErrorData>> handleUnexpectedException(Exception exception) {
		log.error("Unhandled exception", exception);
		return errorResponse(ErrorCode.INTERNAL_SERVER_ERROR);
	}

	private ResponseEntity<ApiResponse<ErrorData>> errorResponse(ErrorCode errorCode) {
		ErrorData data = new ErrorData(errorCode.message());
		ApiResponse<ErrorData> response = ApiResponse.error(errorCode.code(), data);
		return ResponseEntity.status(errorCode.httpStatus()).body(response);
	}
}
