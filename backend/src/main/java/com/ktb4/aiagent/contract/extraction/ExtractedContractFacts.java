package com.ktb4.aiagent.contract.extraction;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ktb4.aiagent.contract.dto.IndustryCategory;

public record ExtractedContractFacts(
	IndustryCategory industry,
	@JsonProperty("weekly_working_hours") double weeklyWorkingHours,
	@JsonProperty("daily_working_hours") double dailyWorkingHours,
	@JsonProperty("rest_minutes_per_workday") int restMinutesPerWorkday,
	@JsonProperty("rest_time_specified") boolean restTimeSpecified,
	@JsonProperty("weekly_paid_holidays") int weeklyPaidHolidays,
	@JsonProperty("monthly_wage") int monthlyWage,
	@JsonProperty("wage_specified") boolean wageSpecified,
	@JsonProperty("working_hours_specified") boolean workingHoursSpecified,
	@JsonProperty("holiday_specified") boolean holidaySpecified,
	@JsonProperty("contract_period_months") int contractPeriodMonths,
	@JsonProperty("payment_date_specified") boolean paymentDateSpecified,
	@JsonProperty("payment_method_in_person") boolean paymentMethodInPerson,
	@JsonProperty("accommodation_deduction_krw") int accommodationDeductionKrw,
	@JsonProperty("employee_name") String employeeName,
	@JsonProperty("contract_start_date") String contractStartDate,
	@JsonProperty("contract_end_date") String contractEndDate,
	@JsonProperty("document_type") String documentType
) {
	public ExtractedContractFacts(IndustryCategory industry, double weeklyWorkingHours, double dailyWorkingHours,
			int restMinutesPerWorkday, boolean restTimeSpecified, int weeklyPaidHolidays, int monthlyWage,
			boolean wageSpecified, boolean workingHoursSpecified, boolean holidaySpecified, int contractPeriodMonths,
			boolean paymentDateSpecified, boolean paymentMethodInPerson, int accommodationDeductionKrw) {
		this(industry, weeklyWorkingHours, dailyWorkingHours, restMinutesPerWorkday, restTimeSpecified,
			weeklyPaidHolidays, monthlyWage, wageSpecified, workingHoursSpecified, holidaySpecified,
			contractPeriodMonths, paymentDateSpecified, paymentMethodInPerson, accommodationDeductionKrw,
			"", "", "", "employment_contract");
	}

	public ExtractedContractFacts(IndustryCategory industry, double weeklyWorkingHours, double dailyWorkingHours,
			int restMinutesPerWorkday, boolean restTimeSpecified, int weeklyPaidHolidays, int monthlyWage,
			boolean wageSpecified, boolean workingHoursSpecified, boolean holidaySpecified, int contractPeriodMonths,
			boolean paymentDateSpecified, boolean paymentMethodInPerson, int accommodationDeductionKrw,
			String employeeName, String contractStartDate, String contractEndDate) {
		this(industry, weeklyWorkingHours, dailyWorkingHours, restMinutesPerWorkday, restTimeSpecified,
			weeklyPaidHolidays, monthlyWage, wageSpecified, workingHoursSpecified, holidaySpecified,
			contractPeriodMonths, paymentDateSpecified, paymentMethodInPerson, accommodationDeductionKrw,
			employeeName, contractStartDate, contractEndDate, "employment_contract");
	}
}
