package com.ktb4.aiagent.payslip.service;

import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import java.util.List;

public record PayslipExtraction(PayslipFacts facts, List<String> unverifiedFields) {
}
