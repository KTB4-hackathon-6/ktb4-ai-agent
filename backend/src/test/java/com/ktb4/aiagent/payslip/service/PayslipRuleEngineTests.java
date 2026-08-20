package com.ktb4.aiagent.payslip.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import java.util.List;
import org.junit.jupiter.api.Test;

class PayslipRuleEngineTests {

	private final PayslipRuleEngine ruleEngine = new PayslipRuleEngine();

	@Test
	void reportsMissingMandatoryPayslipDetails() {
		List<String> ruleIds = ruleEngine.check(facts(
			false, false, false, false, false,
			2_300_000, 209, 0, 0, 0, 0,
			2_300_000, 0, 2_300_000, 0
		)).stream().map(violation -> violation.ruleId()).toList();

		assertThat(ruleIds).contains("payslip_required_details_missing");
	}

	@Test
	void reportsHourlyWageBelowMinimumWageWhenRegularHoursAreKnown() {
		List<String> ruleIds = ruleEngine.check(facts(
			true, true, true, true, true,
			2_000_000, 209, 0, 0, 0, 0,
			2_000_000, 0, 2_000_000, 0
		)).stream().map(violation -> violation.ruleId()).toList();

		assertThat(ruleIds).contains("payslip_below_minimum_wage");
	}

	@Test
	void reportsInsufficientOvertimePremiumWhenHoursAndPayAreKnown() {
		List<String> ruleIds = ruleEngine.check(facts(
			true, true, true, true, true,
			2_090_000, 209, 10, 50_000, 0, 0,
			2_140_000, 0, 2_140_000, 0
		)).stream().map(violation -> violation.ruleId()).toList();

		assertThat(ruleIds).contains("overtime_premium_insufficient");
	}

	@Test
	void reportsInconsistentNetPayCalculation() {
		List<String> ruleIds = ruleEngine.check(facts(
			true, true, true, true, true,
			2_300_000, 209, 0, 0, 0, 0,
			2_300_000, 100_000, 2_250_000, 0
		)).stream().map(violation -> violation.ruleId()).toList();

		assertThat(ruleIds).contains("net_pay_calculation_inconsistent");
	}

	@Test
	void suppressesMinimumWageFindingWhenItsEvidenceIsUnverified() {
		List<String> ruleIds = ruleEngine.suppressUnverified(
			ruleEngine.check(facts(
				true, true, true, true, true,
				2_000_000, 209, 0, 0, 0, 0,
				2_000_000, 0, 2_000_000, 0
			)),
			List.of("regular_working_hours")
		).stream().map(violation -> violation.ruleId()).toList();

		assertThat(ruleIds).doesNotContain("payslip_below_minimum_wage");
	}

	private PayslipFacts facts(
			boolean payPeriodSpecified,
			boolean paymentDateSpecified,
			boolean wageComponentsSpecified,
			boolean calculationMethodSpecified,
			boolean deductionsSpecified,
			int basePay,
			double regularWorkingHours,
			double overtimeHours,
			int overtimePay,
			int nightPay,
			int holidayPay,
			int grossPay,
			int totalDeductions,
			int netPay,
			int unclassifiedDeduction) {
		return new PayslipFacts(
			payPeriodSpecified, paymentDateSpecified, wageComponentsSpecified,
			calculationMethodSpecified, deductionsSpecified, basePay, regularWorkingHours,
			overtimeHours, overtimePay, nightPay, holidayPay, grossPay, totalDeductions,
			netPay, unclassifiedDeduction
		);
	}
}
