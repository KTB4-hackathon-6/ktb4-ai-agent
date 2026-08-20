package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.contract.dto.Severity;
import java.util.List;
import org.junit.jupiter.api.Test;

class ContractRuleEngineTests {

	private final ContractRuleEngine ruleEngine = new ContractRuleEngine();

	@Test
	void detectsUnderpaymentAndInsufficientRest() {
		ContractFacts facts = facts(9_000, 30, 1, 36);

		assertThat(ruleIds(ruleEngine.check(facts)))
			.containsExactlyInAnyOrder("below_minimum_wage", "rest_time_insufficient");
	}

	@Test
	void defersRestTimeCheckWhenRestTimeIsNotSpecified() {
		List<RuleViolation> violations = ruleEngine.check(facts(11_000, 0, false, 1, 36));

		assertThat(ruleIds(violations)).containsExactly("rest_time_needs_review");
		assertThat(violations.getFirst().severity()).isEqualTo(Severity.REVIEW);
	}

	@Test
	void classifiesExtendedContractPeriodAsReview() {
		List<RuleViolation> violations = ruleEngine.check(facts(11_000, 60, 1, 48));

		assertThat(violations)
			.filteredOn(violation -> violation.ruleId().equals("contract_period_review"))
			.singleElement()
			.extracting(RuleViolation::severity)
			.isEqualTo(Severity.REVIEW);
	}

	@Test
	void suppressesOnlyRulesDependingOnUnverifiedFields() {
		List<RuleViolation> violations = ruleEngine.check(facts(9_000, 30, 1, 36));

		List<RuleViolation> remaining = ruleEngine.suppressUnverified(
			violations,
			List.of("monthly_wage")
		);

		assertThat(ruleIds(remaining)).containsExactly("rest_time_insufficient");
	}

	@Test
	void keepsT01ToT10ContractRestTimeScenariosFreeOfRestTimeViolations() {
		List<ContractFacts> scenarios = List.of(
			contractFacts(IndustryCategory.MANUFACTURING, 8, 60), // T01
			contractFacts(IndustryCategory.MANUFACTURING, 8, 60), // T02
			contractFacts(IndustryCategory.MANUFACTURING, 8, 60), // T03
			contractFacts(IndustryCategory.MANUFACTURING, 8, 60), // T04
			contractFacts(IndustryCategory.MANUFACTURING, 8, 60), // T05
			contractFacts(IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY, 8, 120), // T06
			contractFacts(IndustryCategory.MANUFACTURING, 8, 60), // T07
			contractFacts(IndustryCategory.OTHER, 8, 60), // T08
			contractFacts(IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY, 8, 120), // T09
			contractFacts(IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY, 8, 120) // T10
		);

		for (ContractFacts facts : scenarios) {
			assertThat(ruleIds(ruleEngine.check(facts)))
				.doesNotContain("rest_time_insufficient", "rest_time_needs_review");
		}
	}

	private ContractFacts facts(int hourlyWage, int restMinutes, int holidays, int periodMonths) {
		return facts(hourlyWage, restMinutes, true, holidays, periodMonths);
	}

	private ContractFacts facts(
			int hourlyWage, int restMinutes, boolean restTimeSpecified, int holidays, int periodMonths) {
		return new ContractFacts(
			IndustryCategory.MANUFACTURING,
			45,
			8,
			restMinutes,
			restTimeSpecified,
			holidays,
			2_300_000,
			hourlyWage,
			true,
			true,
			true,
			periodMonths,
			true,
			false,
			80_000
		);
	}

	private ContractFacts contractFacts(
			IndustryCategory industry, int dailyWorkingHours, int restMinutes) {
		return new ContractFacts(
			industry,
			dailyWorkingHours * 5,
			dailyWorkingHours,
			restMinutes,
			true,
			1,
			2_300_000,
			11_000,
			true,
			true,
			true,
			12,
			true,
			false,
			0
		);
	}

	private List<String> ruleIds(List<RuleViolation> violations) {
		return violations.stream().map(RuleViolation::ruleId).toList();
	}
}
