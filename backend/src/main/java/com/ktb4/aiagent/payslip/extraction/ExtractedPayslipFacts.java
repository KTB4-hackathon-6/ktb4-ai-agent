package com.ktb4.aiagent.payslip.extraction;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ExtractedPayslipFacts(
	@JsonProperty("pay_period_specified") boolean payPeriodSpecified,
	@JsonProperty("payment_date_specified") boolean paymentDateSpecified,
	@JsonProperty("wage_components_specified") boolean wageComponentsSpecified,
	@JsonProperty("calculation_method_specified") boolean calculationMethodSpecified,
	@JsonProperty("deductions_specified") boolean deductionsSpecified,
	@JsonProperty("base_pay") int basePay,
	@JsonProperty("regular_working_hours") double regularWorkingHours,
	@JsonProperty("overtime_hours") double overtimeHours,
	@JsonProperty("overtime_pay") int overtimePay,
	@JsonProperty("night_pay") int nightPay,
	@JsonProperty("holiday_pay") int holidayPay,
	@JsonProperty("gross_pay") int grossPay,
	@JsonProperty("total_deductions") int totalDeductions,
	@JsonProperty("net_pay") int netPay,
	@JsonProperty("unclassified_deduction") int unclassifiedDeduction,
	@JsonProperty("employee_name") String employeeName,
	@JsonProperty("pay_period") String payPeriod
) {
	public ExtractedPayslipFacts(boolean payPeriodSpecified, boolean paymentDateSpecified, boolean wageComponentsSpecified,
			boolean calculationMethodSpecified, boolean deductionsSpecified, int basePay, double regularWorkingHours,
			double overtimeHours, int overtimePay, int nightPay, int holidayPay, int grossPay, int totalDeductions,
			int netPay, int unclassifiedDeduction) {
		this(payPeriodSpecified, paymentDateSpecified, wageComponentsSpecified, calculationMethodSpecified,
			deductionsSpecified, basePay, regularWorkingHours, overtimeHours, overtimePay, nightPay, holidayPay,
			grossPay, totalDeductions, netPay, unclassifiedDeduction, "", "");
	}
}
