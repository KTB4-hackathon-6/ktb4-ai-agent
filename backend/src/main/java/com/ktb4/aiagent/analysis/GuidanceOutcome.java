package com.ktb4.aiagent.analysis;

import java.util.List;
import java.util.Objects;

public record GuidanceOutcome(
	String answer,
	AgencyCode agencyCode,
	String agencyName,
	String jurisdictionOfficeName,
	List<SubmissionOption> submissionOptions,
	List<String> requiredAttachments,
	List<String> steps,
	String notes
) {
	public GuidanceOutcome {
		answer = requireText(answer, "Answer must not be blank");
		agencyCode = Objects.requireNonNull(agencyCode, "Agency code must not be null");
		agencyName = requireText(agencyName, "Agency name must not be blank");
		jurisdictionOfficeName = requireText(
			jurisdictionOfficeName,
			"Jurisdiction office name must not be blank"
		);
		submissionOptions = List.copyOf(submissionOptions);
		requiredAttachments = List.copyOf(requiredAttachments);
		steps = List.copyOf(steps);
		if (submissionOptions.isEmpty()) {
			throw new IllegalArgumentException("Submission options must not be empty");
		}
		if (steps.isEmpty()) {
			throw new IllegalArgumentException("Guidance steps must not be empty");
		}
	}

	public record SubmissionOption(
		SubmissionChannel channel,
		String label,
		String url,
		String address,
		String instructions
	) {
		public SubmissionOption {
			channel = Objects.requireNonNull(channel, "Submission channel must not be null");
			label = requireText(label, "Submission option label must not be blank");
			instructions = requireText(instructions, "Submission instructions must not be blank");
			if (channel == SubmissionChannel.ONLINE && (url == null || url.isBlank())) {
				throw new IllegalArgumentException("ONLINE submission requires a URL");
			}
			if (channel == SubmissionChannel.VISIT && (address == null || address.isBlank())) {
				throw new IllegalArgumentException("VISIT submission requires an address");
			}
		}
	}

	public enum AgencyCode {
		MOEL
	}

	public enum SubmissionChannel {
		ONLINE,
		VISIT,
		MAIL
	}

	private static String requireText(String value, String message) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(message);
		}
		return value;
	}
}
