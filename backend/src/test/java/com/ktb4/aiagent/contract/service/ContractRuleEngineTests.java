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

	private ContractFacts facts(int hourlyWage, int restMinutes, int holidays, int periodMonths) {
		return new ContractFacts(
			IndustryCategory.MANUFACTURING,
			45,
			8,
			restMinutes,
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

	private List<String> ruleIds(List<RuleViolation> violations) {
		return violations.stream().map(RuleViolation::ruleId).toList();
	}
}
