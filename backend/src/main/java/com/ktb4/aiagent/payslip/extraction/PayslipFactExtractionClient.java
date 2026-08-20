package com.ktb4.aiagent.payslip.extraction;

public interface PayslipFactExtractionClient {
	ExtractedPayslipFacts extract(String rawText);
}
