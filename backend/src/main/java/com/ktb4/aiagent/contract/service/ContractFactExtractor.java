package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.extraction.ContractFactExtractionClient;
import com.ktb4.aiagent.contract.extraction.ExtractedContractFacts;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class ContractFactExtractor {

	private static final int MONTHLY_STANDARD_HOURS = 209;
	private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+");

	private final ContractFactExtractionClient extractionClient;

	public ContractFactExtractor(ContractFactExtractionClient extractionClient) {
		this.extractionClient = extractionClient;
	}

	public ContractExtraction extract(String rawText) {
		ExtractedContractFacts extracted = extractionClient.extract(rawText);
		ContractFacts facts = toContractFacts(extracted);
		Set<String> unverified = new LinkedHashSet<>();
		unverified.addAll(groundingWarnings(facts, rawText));
		unverified.addAll(weeklyHoursWarnings(facts));
		unverified.addAll(specifiedButZeroWarnings(facts));
		return new ContractExtraction(facts, List.copyOf(unverified));
	}

	private ContractFacts toContractFacts(ExtractedContractFacts extracted) {
		int hourlyWage = extracted.monthlyWage() <= 0
			? 0
			: (int) Math.round(extracted.monthlyWage() / (double) MONTHLY_STANDARD_HOURS);
		return new ContractFacts(
			extracted.industry(),
			extracted.weeklyWorkingHours(),
			extracted.dailyWorkingHours(),
			extracted.restMinutesPerWorkday(),
			extracted.weeklyPaidHolidays(),
			extracted.monthlyWage(),
			hourlyWage,
			extracted.wageSpecified(),
			extracted.workingHoursSpecified(),
			extracted.holidaySpecified(),
			extracted.contractPeriodMonths(),
			extracted.paymentDateSpecified(),
			extracted.paymentMethodInPerson(),
			extracted.accommodationDeductionKrw()
		);
	}

	private List<String> groundingWarnings(ContractFacts facts, String rawText) {
		Set<String> numbers = numbersIn(rawText);
		List<String> warnings = new ArrayList<>();
		addIfUngrounded(warnings, "rest_minutes_per_workday", facts.restMinutesPerWorkday(), numbers);
		addIfUngrounded(warnings, "weekly_paid_holidays", facts.weeklyPaidHolidays(), numbers);
		addIfUngrounded(warnings, "monthly_wage", facts.monthlyWage(), numbers);
		addIfUngrounded(warnings, "contract_period_months", facts.contractPeriodMonths(), numbers);
		addIfUngrounded(warnings, "accommodation_deduction_krw", facts.accommodationDeductionKrw(), numbers);
		return warnings;
	}

	private Set<String> numbersIn(String rawText) {
		Matcher matcher = NUMBER_PATTERN.matcher(rawText.replace(",", ""));
		Set<String> numbers = new LinkedHashSet<>();
		while (matcher.find()) {
			numbers.add(matcher.group());
		}
		return numbers;
	}

	private void addIfUngrounded(List<String> warnings, String field, int value, Set<String> numbers) {
		if (value != 0 && !isGrounded(value, numbers)) {
			warnings.add(field);
		}
	}

	private boolean isGrounded(int value, Set<String> numbers) {
		if (numbers.contains(String.valueOf(value))) {
			return true;
		}
		for (int hours = 1; hours <= 12; hours++) {
			int minutes = value - hours * 60;
			if (minutes >= 0 && minutes < 60
					&& numbers.contains(String.valueOf(hours))
					&& numbers.contains(String.valueOf(minutes))) {
				return true;
			}
		}
		return false;
	}

	private List<String> weeklyHoursWarnings(ContractFacts facts) {
		if (!facts.workingHoursSpecified()
				|| facts.industry() == IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY
				|| facts.dailyWorkingHours() <= 0) {
			return List.of();
		}
		double lower = facts.dailyWorkingHours();
		double upper = facts.dailyWorkingHours() * 7;
		if (facts.weeklyWorkingHours() < lower || facts.weeklyWorkingHours() > upper) {
			return List.of("weekly_working_hours");
		}
		return List.of();
	}

	private List<String> specifiedButZeroWarnings(ContractFacts facts) {
		List<String> warnings = new ArrayList<>();
		boolean exempt = facts.industry() == IndustryCategory.AGRICULTURE_LIVESTOCK_FISHERY;
		if (facts.workingHoursSpecified() && facts.dailyWorkingHours() <= 0 && !exempt) {
			warnings.add("daily_working_hours");
		}
		if (facts.holidaySpecified() && facts.weeklyPaidHolidays() <= 0 && !exempt) {
			warnings.add("weekly_paid_holidays");
		}
		if (facts.wageSpecified() && facts.monthlyWage() <= 0) {
			warnings.add("monthly_wage");
		}
		return warnings;
	}
}
