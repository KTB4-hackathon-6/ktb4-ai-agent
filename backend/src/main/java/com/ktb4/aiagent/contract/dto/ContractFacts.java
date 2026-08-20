package com.ktb4.aiagent.contract.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "근로계약서에서 추출한 구조화된 근로조건")
public record ContractFacts(
	IndustryCategory industry,
	@Schema(description = "연장근로를 포함한 주당 근로시간", example = "45")
	@JsonProperty("weekly_working_hours") double weeklyWorkingHours,
	@Schema(description = "하루 근로시간", example = "8")
	@JsonProperty("daily_working_hours") double dailyWorkingHours,
	@Schema(description = "하루 휴게시간(분)", example = "60")
	@JsonProperty("rest_minutes_per_workday") int restMinutesPerWorkday,
	@JsonProperty("rest_time_specified") boolean restTimeSpecified,
	@Schema(description = "주당 유급휴일 수", example = "1")
	@JsonProperty("weekly_paid_holidays") int weeklyPaidHolidays,
	@Schema(description = "계약서에 기재된 월급(원)", example = "2300000")
	@JsonProperty("monthly_wage") int monthlyWage,
	@Schema(description = "월급을 월 209시간으로 나눈 계산 시급(원)", example = "11005")
	@JsonProperty("hourly_wage") int hourlyWage,
	@JsonProperty("wage_specified") boolean wageSpecified,
	@JsonProperty("working_hours_specified") boolean workingHoursSpecified,
	@JsonProperty("holiday_specified") boolean holidaySpecified,
	@JsonProperty("contract_period_months") int contractPeriodMonths,
	@JsonProperty("payment_date_specified") boolean paymentDateSpecified,
	@JsonProperty("payment_method_in_person") boolean paymentMethodInPerson,
	@JsonProperty("accommodation_deduction_krw") int accommodationDeductionKrw,
	@JsonProperty("employee_name") String employeeName,
	@JsonProperty("contract_start_date") String contractStartDate,
	@JsonProperty("contract_end_date") String contractEndDate
) {
	public ContractFacts(IndustryCategory industry, double weeklyWorkingHours, double dailyWorkingHours,
			int restMinutesPerWorkday, int weeklyPaidHolidays, int monthlyWage, int hourlyWage,
			boolean wageSpecified, boolean workingHoursSpecified, boolean holidaySpecified,
			int contractPeriodMonths, boolean paymentDateSpecified, boolean paymentMethodInPerson,
			int accommodationDeductionKrw) {
		this(industry, weeklyWorkingHours, dailyWorkingHours, restMinutesPerWorkday, true, weeklyPaidHolidays,
			monthlyWage, hourlyWage, wageSpecified, workingHoursSpecified, holidaySpecified, contractPeriodMonths,
			paymentDateSpecified, paymentMethodInPerson, accommodationDeductionKrw, "", "", "");
	}

	public ContractFacts(IndustryCategory industry, double weeklyWorkingHours, double dailyWorkingHours,
			int restMinutesPerWorkday, boolean restTimeSpecified, int weeklyPaidHolidays, int monthlyWage,
			int hourlyWage, boolean wageSpecified, boolean workingHoursSpecified, boolean holidaySpecified,
			int contractPeriodMonths, boolean paymentDateSpecified, boolean paymentMethodInPerson,
			int accommodationDeductionKrw) {
		this(industry, weeklyWorkingHours, dailyWorkingHours, restMinutesPerWorkday, restTimeSpecified,
			weeklyPaidHolidays, monthlyWage, hourlyWage, wageSpecified, workingHoursSpecified, holidaySpecified,
			contractPeriodMonths, paymentDateSpecified, paymentMethodInPerson, accommodationDeductionKrw,
			"", "", "");
	}
}
