package com.ktb4.aiagent.ocr.exception;

public class ClovaOcrClientException extends RuntimeException {

	public ClovaOcrClientException(String message) {
		super(message);
	}

	public ClovaOcrClientException(String message, Throwable cause) {
		super(message, cause);
	}
}
