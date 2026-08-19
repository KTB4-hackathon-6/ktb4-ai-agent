package com.ktb4.aiagent.contract.service;

public interface ContractAnalysisProgressListener {

	default void onOcrProgress(int processedFiles, int totalFiles) {
	}

	default void onStructuring() {
	}

	default void onGeneratingResponse() {
	}

	static ContractAnalysisProgressListener none() {
		return new ContractAnalysisProgressListener() {
		};
	}
}
