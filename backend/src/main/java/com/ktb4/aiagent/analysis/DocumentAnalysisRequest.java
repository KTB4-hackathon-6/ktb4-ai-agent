package com.ktb4.aiagent.analysis;

import java.util.List;

public record DocumentAnalysisRequest(
	String requestId,
	String sessionId,
	PreferredLanguage preferredLanguage,
	String text,
	List<Document> documents,
	List<LegalCheck> legalChecks
) {
	public DocumentAnalysisRequest {
		if (preferredLanguage == null) {
			throw new IllegalArgumentException("Preferred language must not be null");
		}
		if (text == null || text.isBlank() || text.length() > 4_000) {
			throw new IllegalArgumentException("Review text must be between 1 and 4000 characters");
		}
		documents = List.copyOf(documents);
		legalChecks = List.copyOf(legalChecks);
	}

	public List<String> documentIds() {
		return documents.stream().map(Document::documentId).toList();
	}

	public record Document(String documentId, String fileName, List<Page> pages) {
		public Document {
			pages = List.copyOf(pages);
		}
	}

	public record Page(int pageNumber, String text) {
	}

	public record LegalCheck(
		CheckId checkId,
		CheckResult result
	) {
	}

	public enum CheckId {
		WAGE_DISCLOSURE_MISSING,
		WORKING_HOURS_DISCLOSURE_MISSING,
		HOLIDAY_DISCLOSURE_MISSING,
		PAYMENT_DATE_DISCLOSURE_MISSING,
		BELOW_MINIMUM_WAGE,
		REST_TIME_NEEDS_REVIEW,
		REST_TIME_INSUFFICIENT,
		WEEKLY_HOLIDAY_MISSING,
		CONTRACT_PERIOD_REVIEW,
		CONTRACT_PERIOD_EXCEEDED,
		IN_PERSON_PAYMENT_RISK,
		ACCOMMODATION_DEDUCTION_HIGH;

		public static CheckId fromRuleId(String ruleId) {
			return switch (ruleId) {
				case "wage_disclosure_missing" -> WAGE_DISCLOSURE_MISSING;
				case "working_hours_disclosure_missing" -> WORKING_HOURS_DISCLOSURE_MISSING;
				case "holiday_disclosure_missing" -> HOLIDAY_DISCLOSURE_MISSING;
				case "payment_date_disclosure_missing" -> PAYMENT_DATE_DISCLOSURE_MISSING;
				case "below_minimum_wage" -> BELOW_MINIMUM_WAGE;
				case "rest_time_needs_review" -> REST_TIME_NEEDS_REVIEW;
				case "rest_time_insufficient" -> REST_TIME_INSUFFICIENT;
				case "weekly_holiday_missing" -> WEEKLY_HOLIDAY_MISSING;
				case "contract_period_review" -> CONTRACT_PERIOD_REVIEW;
				case "contract_period_exceeded" -> CONTRACT_PERIOD_EXCEEDED;
				case "in_person_payment_risk" -> IN_PERSON_PAYMENT_RISK;
				case "accommodation_deduction_high" -> ACCOMMODATION_DEDUCTION_HIGH;
				default -> throw new IllegalArgumentException("Unsupported rule ID: " + ruleId);
			};
		}
	}

	public enum CheckResult {
		DETECTED,
		REVIEW_REQUIRED
	}
}
