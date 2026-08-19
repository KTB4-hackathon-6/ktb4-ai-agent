package com.ktb4.aiagent.contract.extraction;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ktb4.aiagent.contract.dto.IndustryCategory;

public record ExtractedContractFacts(
	IndustryCategory industry,
	@JsonProperty("weekly_working_hours") double weeklyWorkingHours,
	@JsonProperty("daily_working_hours") double dailyWorkingHours,
	@JsonProperty("rest_minutes_per_workday") int restMinutesPerWorkday,
	@JsonProperty("weekly_paid_holidays") int weeklyPaidHolidays,
	@JsonProperty("monthly_wage") int monthlyWage,
	@JsonProperty("wage_specified") boolean wageSpecified,
	@JsonProperty("working_hours_specified") boolean workingHoursSpecified,
	@JsonProperty("holiday_specified") boolean holidaySpecified,
	@JsonProperty("contract_period_months") int contractPeriodMonths,
	@JsonProperty("payment_date_specified") boolean paymentDateSpecified,
	@JsonProperty("payment_method_in_person") boolean paymentMethodInPerson,
	@JsonProperty("accommodation_deduction_krw") int accommodationDeductionKrw
) {
}
