package com.ktb4.aiagent.payslip.service;

import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import com.ktb4.aiagent.payslip.extraction.ExtractedPayslipFacts;
import com.ktb4.aiagent.payslip.extraction.PayslipFactExtractionClient;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class PayslipFactExtractor {

	private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+");
	private final PayslipFactExtractionClient extractionClient;

	public PayslipFactExtractor(PayslipFactExtractionClient extractionClient) {
		this.extractionClient = extractionClient;
	}

	public PayslipExtraction extract(String rawText) {
		ExtractedPayslipFacts extracted = extractionClient.extract(rawText);
		PayslipFacts facts = new PayslipFacts(extracted.payPeriodSpecified(), extracted.paymentDateSpecified(),
			extracted.wageComponentsSpecified(), extracted.calculationMethodSpecified(), extracted.deductionsSpecified(),
			extracted.basePay(), extracted.regularWorkingHours(), extracted.overtimeHours(), extracted.overtimePay(),
			extracted.nightPay(), extracted.holidayPay(), extracted.grossPay(), extracted.totalDeductions(),
			extracted.netPay(), extracted.unclassifiedDeduction(), extracted.employeeName(), extracted.payPeriod());
		return new PayslipExtraction(facts, groundingWarnings(facts, rawText));
	}

	private List<String> groundingWarnings(PayslipFacts facts, String rawText) {
		Set<String> numbers = new LinkedHashSet<>();
		Matcher matcher = NUMBER_PATTERN.matcher(rawText.replace(",", ""));
		while (matcher.find()) {
			numbers.add(matcher.group());
		}
		List<String> warnings = new ArrayList<>();
		addIfUngrounded(warnings, "base_pay", facts.basePay(), numbers);
		addIfUngrounded(warnings, "regular_working_hours", facts.regularWorkingHours(), numbers);
		addIfUngrounded(warnings, "overtime_hours", facts.overtimeHours(), numbers);
		addIfUngrounded(warnings, "overtime_pay", facts.overtimePay(), numbers);
		addIfUngrounded(warnings, "gross_pay", facts.grossPay(), numbers);
		addIfUngrounded(warnings, "total_deductions", facts.totalDeductions(), numbers);
		addIfUngrounded(warnings, "net_pay", facts.netPay(), numbers);
		addIfUngrounded(warnings, "unclassified_deduction", facts.unclassifiedDeduction(), numbers);
		return List.copyOf(warnings);
	}

	private void addIfUngrounded(List<String> warnings, String field, double value, Set<String> numbers) {
		if (value != 0 && !numbers.contains(String.valueOf((long) value))) {
			warnings.add(field);
		}
	}
}
