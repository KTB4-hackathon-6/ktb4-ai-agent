package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import java.util.List;

public record ContractDiagnosisContext(
	ContractDiagnosis diagnosis,
	List<SourceDocument> documents
) {
	public ContractDiagnosisContext {
		documents = List.copyOf(documents);
	}

	public record SourceDocument(String fileName, String text) {
	}
}
