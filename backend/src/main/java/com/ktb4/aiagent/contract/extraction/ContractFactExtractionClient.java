package com.ktb4.aiagent.contract.extraction;

@FunctionalInterface
public interface ContractFactExtractionClient {

	ExtractedContractFacts extract(String rawText);
}
