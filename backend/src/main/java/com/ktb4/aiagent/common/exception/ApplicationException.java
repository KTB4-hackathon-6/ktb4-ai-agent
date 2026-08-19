package com.ktb4.aiagent.common.exception;

import java.util.Objects;

public class ApplicationException extends RuntimeException {

	private final ErrorCode errorCode;

	public ApplicationException(ErrorCode errorCode) {
		super(Objects.requireNonNull(errorCode, "Error code must not be null").message());
		this.errorCode = errorCode;
	}

	public ErrorCode errorCode() {
		return errorCode;
	}
}
