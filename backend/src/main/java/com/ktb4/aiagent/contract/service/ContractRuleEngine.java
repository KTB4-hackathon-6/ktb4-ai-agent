package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.contract.dto.Severity;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ContractRuleEngine {

	private static final int MINIMUM_HOURLY_WAGE = 10_320;
	private static final int MAX_STANDARD_CONTRACT_MONTHS = 36;
	private static final int MAX_EXTENDED_CONTRACT_MONTHS = 58;
	private static final double ACCOMMODATION_DEDUCTION_REVIEW_RATIO = 0.15;
	private static final Map<String, Set<String>> DEPENDENT_RULE_IDS = dependentRuleIds();

	public List<RuleViolation> check(ContractFacts facts) {
		List<RuleViolation> violations = new ArrayList<>();
		violations.addAll(checkRequiredDisclosures(facts));
		violations.addAll(checkMinimumWage(facts));
		violations.addAll(checkContractPeriod(facts));
		violations.addAll(checkPaymentMethod(facts));
		violations.addAll(checkAccommodationDeduction(facts));
		if (facts.industry() != IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY) {
			violations.addAll(checkRestTime(facts));
			violations.addAll(checkWeeklyHoliday(facts));
		}
		return List.copyOf(violations);
	}

	public List<RuleViolation> suppressUnverified(
			List<RuleViolation> violations,
			List<String> unverifiedFields) {
		Set<String> suppressed = new HashSet<>();
		for (String field : unverifiedFields) {
			suppressed.addAll(DEPENDENT_RULE_IDS.getOrDefault(field, Set.of()));
		}
		return violations.stream()
			.filter(violation -> !suppressed.contains(violation.ruleId()))
			.toList();
	}

	private List<RuleViolation> checkRequiredDisclosures(ContractFacts facts) {
		List<RuleViolation> violations = new ArrayList<>();
		addMissingDisclosure(violations, "wage_disclosure_missing", "임금", facts.wageSpecified());
		addMissingDisclosure(
			violations,
			"working_hours_disclosure_missing",
			"근로시간",
			facts.workingHoursSpecified()
		);
		addMissingDisclosure(violations, "holiday_disclosure_missing", "휴일", facts.holidaySpecified());
		addMissingDisclosure(
			violations,
			"payment_date_disclosure_missing",
			"임금 지급일",
			facts.paymentDateSpecified()
		);
		return violations;
	}

	private void addMissingDisclosure(
			List<RuleViolation> violations,
			String ruleId,
			String label,
			boolean specified) {
		if (!specified) {
			violations.add(new RuleViolation(
				ruleId,
				"근로기준법",
				"제17조",
				label + " 항목이 계약서에 명시되어 있지 않습니다.",
				Severity.WARNING
			));
		}
	}

	private List<RuleViolation> checkMinimumWage(ContractFacts facts) {
		if (facts.hourlyWage() >= MINIMUM_HOURLY_WAGE) {
			return List.of();
		}
		return List.of(new RuleViolation(
			"below_minimum_wage",
			"최저임금법",
			"제6조",
			"시급 %,d원은 2026년 최저임금 %,d원에 미달합니다."
				.formatted(facts.hourlyWage(), MINIMUM_HOURLY_WAGE),
			Severity.WARNING,
			Map.of("hourlyWage", facts.hourlyWage(), "minimumWage", MINIMUM_HOURLY_WAGE)
		));
	}

	private List<RuleViolation> checkRestTime(ContractFacts facts) {
		int requiredMinutes = facts.dailyWorkingHours() >= 8 ? 60
			: facts.dailyWorkingHours() >= 4 ? 30 : 0;
		if (requiredMinutes == 0) {
			return List.of();
		}
		if (!facts.restTimeSpecified()) {
			return List.of(new RuleViolation(
				"rest_time_needs_review",
				"근로기준법",
				"제54조",
				"휴게시간이 계약서에 명시되어 있는지 확인되지 않아 법정 휴게시간 충족 여부를 판정할 수 없습니다.",
				Severity.REVIEW
			));
		}
		if (facts.restMinutesPerWorkday() >= requiredMinutes) {
			return List.of();
		}
		return List.of(new RuleViolation(
			"rest_time_insufficient",
			"근로기준법",
			"제54조",
			"1일 근로시간 %s시간 기준 휴게시간은 최소 %d분이 필요하지만 %d분으로 명시되어 있습니다."
				.formatted(facts.dailyWorkingHours(), requiredMinutes, facts.restMinutesPerWorkday()),
			Severity.WARNING,
			Map.of(
				"dailyHours", facts.dailyWorkingHours(),
				"requiredMinutes", requiredMinutes,
				"actualMinutes", facts.restMinutesPerWorkday()
			)
		));
	}

	private List<RuleViolation> checkWeeklyHoliday(ContractFacts facts) {
		if (facts.weeklyPaidHolidays() >= 1) {
			return List.of();
		}
		return List.of(new RuleViolation(
			"weekly_holiday_missing",
			"근로기준법",
			"제55조",
			"주 1회 이상의 유급휴일이 명시되어 있지 않습니다.",
			Severity.WARNING
		));
	}

	private List<RuleViolation> checkContractPeriod(ContractFacts facts) {
		if (facts.contractPeriodMonths() <= MAX_STANDARD_CONTRACT_MONTHS) {
			return List.of();
		}
		if (facts.contractPeriodMonths() <= MAX_EXTENDED_CONTRACT_MONTHS) {
			return List.of(new RuleViolation(
				"contract_period_review",
				"외국인근로자의 고용 등에 관한 법률",
				"제18조의2",
				("근로계약기간 %d개월은 기본 취업활동 기간 36개월(3년)을 초과합니다. "
					+ "취업활동 기간 연장허가(최대 1년 10개월 추가)를 받았는지 확인이 필요합니다.")
					.formatted(facts.contractPeriodMonths()),
				Severity.REVIEW,
				Map.of("months", facts.contractPeriodMonths())
			));
		}
		return List.of(new RuleViolation(
			"contract_period_exceeded",
			"외국인근로자의 고용 등에 관한 법률",
			"제18조",
			"근로계약기간 %d개월은 연장허가를 받아도 넘을 수 없는 상한 58개월(4년 10개월)을 초과합니다."
				.formatted(facts.contractPeriodMonths()),
			Severity.WARNING,
			Map.of("months", facts.contractPeriodMonths())
		));
	}

	private List<RuleViolation> checkPaymentMethod(ContractFacts facts) {
		if (!facts.paymentMethodInPerson()) {
			return List.of();
		}
		return List.of(new RuleViolation(
			"in_person_payment_risk",
			"근로기준법",
			"제43조",
			"임금 지급 방법이 통장 입금이 아닌 현금 직접 지급으로 명시되어 있습니다. "
				+ "통장·도장을 사용자가 관리하는 등 임금 관리 리스크가 없는지 확인이 필요합니다.",
			Severity.REVIEW
		));
	}

	private List<RuleViolation> checkAccommodationDeduction(ContractFacts facts) {
		if (facts.accommodationDeductionKrw() <= 0 || facts.monthlyWage() <= 0) {
			return List.of();
		}
		double ratio = facts.accommodationDeductionKrw() / (double) facts.monthlyWage();
		if (ratio < ACCOMMODATION_DEDUCTION_REVIEW_RATIO) {
			return List.of();
		}
		return List.of(new RuleViolation(
			"accommodation_deduction_high",
			"외국인근로자의 고용 등에 관한 법률",
			"숙식비 공제지침",
			"숙박비 공제 %,d원은 월급의 %.0f%%로, 고용노동부 숙식비 공제 한도 대비 과다하지 않은지 확인이 필요합니다."
				.formatted(facts.accommodationDeductionKrw(), ratio * 100),
			Severity.REVIEW,
			Map.of(
				"amount", facts.accommodationDeductionKrw(),
				"percent", Math.round(ratio * 100)
			)
		));
	}

	private static Map<String, Set<String>> dependentRuleIds() {
		Map<String, Set<String>> mapping = new HashMap<>();
		mapping.put("monthly_wage", Set.of("below_minimum_wage"));
		mapping.put("rest_minutes_per_workday", Set.of("rest_time_insufficient", "rest_time_needs_review"));
		mapping.put("rest_time_specified", Set.of("rest_time_needs_review"));
		mapping.put("weekly_paid_holidays", Set.of("weekly_holiday_missing"));
		mapping.put("contract_period_months", Set.of("contract_period_exceeded", "contract_period_review"));
		mapping.put("accommodation_deduction_krw", Set.of("accommodation_deduction_high"));
		mapping.put("daily_working_hours", Set.of("rest_time_insufficient"));
		return Map.copyOf(mapping);
	}
}
