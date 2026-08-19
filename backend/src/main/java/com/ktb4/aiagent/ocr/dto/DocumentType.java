package com.ktb4.aiagent.ocr.dto;

import java.util.Locale;

public enum DocumentType {

	CONTRACT,
	PAYSLIP;

	public String toValue() {
		return name().toLowerCase(Locale.ROOT);
	}
}
