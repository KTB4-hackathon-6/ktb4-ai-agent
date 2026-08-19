package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.contract.dto.ContractFacts;
import java.util.List;

public record ContractExtraction(ContractFacts facts, List<String> unverifiedFields) {
	public ContractExtraction {
		unverifiedFields = List.copyOf(unverifiedFields);
	}
}
