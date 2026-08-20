package com.ktb4.aiagent.payslip.service;

import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import com.ktb4.aiagent.payslip.dto.PayslipViolation;
import com.ktb4.aiagent.payslip.dto.PayslipViolationSeverity;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PayslipRuleEngine {

	private static final int MINIMUM_HOURLY_WAGE = 10_320;
	private static final Map<String, Set<String>> DEPENDENT_RULE_IDS = dependentRuleIds();

	public List<PayslipViolation> check(PayslipFacts facts) {
		List<PayslipViolation> violations = new ArrayList<>();
		if (!facts.payPeriodSpecified() || !facts.paymentDateSpecified()
				|| !facts.wageComponentsSpecified() || !facts.calculationMethodSpecified()
				|| !facts.deductionsSpecified()) {
			violations.add(violation(
				"payslip_required_details_missing", "근로기준법", "제43조의2",
				"급여명세서에 임금 구성항목·계산방법·공제내역 또는 지급 관련 정보가 충분히 기재되어 있지 않습니다.",
				PayslipViolationSeverity.WARNING
			));
		}
		if (facts.regularWorkingHours() > 0 && facts.basePay() / facts.regularWorkingHours() < MINIMUM_HOURLY_WAGE) {
			violations.add(violation(
				"payslip_below_minimum_wage", "최저임금법", "제6조",
				"기본급과 기준 근로시간으로 계산한 시급이 2026년 최저임금 10,320원에 미달합니다.",
				PayslipViolationSeverity.WARNING
			));
		}
		if (facts.overtimeHours() > 0 && facts.regularWorkingHours() > 0
				&& facts.overtimePay() < facts.basePay() / facts.regularWorkingHours() * facts.overtimeHours() * 1.5) {
			violations.add(violation(
				"overtime_premium_insufficient", "근로기준법", "제56조",
				"기재된 연장근로시간에 비해 연장근로수당이 통상임금의 50% 이상 가산 기준에 미달할 수 있습니다.",
				PayslipViolationSeverity.WARNING
			));
		}
		if (facts.grossPay() - facts.totalDeductions() != facts.netPay()) {
			violations.add(violation(
				"net_pay_calculation_inconsistent", "근로기준법", "제43조",
				"총지급액에서 총공제액을 뺀 금액과 실수령액이 일치하지 않습니다.",
				PayslipViolationSeverity.WARNING
			));
		}
		if (facts.unclassifiedDeduction() > 0) {
			violations.add(violation(
				"unclassified_deduction_review", "근로기준법", "제43조",
				"분류되지 않은 공제 항목이 있어 법령 또는 근로자 합의에 따른 공제인지 확인이 필요합니다.",
				PayslipViolationSeverity.REVIEW
			));
		}
		return List.copyOf(violations);
	}

	public List<PayslipViolation> suppressUnverified(
			List<PayslipViolation> violations,
			List<String> unverifiedFields) {
		Set<String> suppressed = new HashSet<>();
		for (String field : unverifiedFields) {
			suppressed.addAll(DEPENDENT_RULE_IDS.getOrDefault(field, Set.of()));
		}
		return violations.stream().filter(violation -> !suppressed.contains(violation.ruleId())).toList();
	}

	private PayslipViolation violation(
			String ruleId, String lawName, String article, String message, PayslipViolationSeverity severity) {
		return new PayslipViolation(ruleId, lawName, article, message, severity);
	}

	private static Map<String, Set<String>> dependentRuleIds() {
		Map<String, Set<String>> mapping = new HashMap<>();
		mapping.put("base_pay", Set.of("payslip_below_minimum_wage", "overtime_premium_insufficient"));
		mapping.put("regular_working_hours", Set.of("payslip_below_minimum_wage", "overtime_premium_insufficient"));
		mapping.put("overtime_hours", Set.of("overtime_premium_insufficient"));
		mapping.put("overtime_pay", Set.of("overtime_premium_insufficient"));
		mapping.put("gross_pay", Set.of("net_pay_calculation_inconsistent"));
		mapping.put("total_deductions", Set.of("net_pay_calculation_inconsistent"));
		mapping.put("net_pay", Set.of("net_pay_calculation_inconsistent"));
		mapping.put("unclassified_deduction", Set.of("unclassified_deduction_review"));
		return Map.copyOf(mapping);
	}
}
