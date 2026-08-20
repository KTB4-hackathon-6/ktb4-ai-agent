package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.RuleViolation;
import com.ktb4.aiagent.ocr.service.OcrService;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ContractDiagnosisService {

	private final OcrService ocrService;
	private final ContractFactExtractor factExtractor;
	private final ContractRuleEngine ruleEngine;

	public ContractDiagnosisService(
			OcrService ocrService,
			ContractFactExtractor factExtractor,
			ContractRuleEngine ruleEngine) {
		this.ocrService = ocrService;
		this.factExtractor = factExtractor;
		this.ruleEngine = ruleEngine;
	}

	public ContractDiagnosis diagnose(List<MultipartFile> files) {
		return diagnoseWithContext(files).diagnosis();
	}

	public ContractDiagnosisContext diagnoseWithContext(List<MultipartFile> files) {
		return diagnoseWithContext(files, ContractAnalysisProgressListener.none());
	}

	public ContractDiagnosisContext diagnoseWithContext(
			List<MultipartFile> files,
			ContractAnalysisProgressListener progressListener) {
		if (files == null || files.isEmpty()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		var ocrResults = ocrService.analyzeAll(
			files,
			processedFiles -> progressListener.onOcrProgress(processedFiles, files.size())
		);
		List<ContractDiagnosisContext.SourceDocument> documents = IntStream.range(0, files.size())
			.mapToObj(index -> new ContractDiagnosisContext.SourceDocument(
				files.get(index).getOriginalFilename(),
				ocrResults.get(index).fullText()
			))
			.toList();
		String rawText = documents.stream()
			.map(ContractDiagnosisContext.SourceDocument::text)
			.reduce((front, back) -> front + "\n\n" + back)
			.orElseThrow(() -> new ApplicationException(ErrorCode.INVALID_REQUEST));

		progressListener.onStructuring();
		ContractExtraction extraction = factExtractor.extract(rawText);
		List<RuleViolation> violations = ruleEngine.check(extraction.facts());
		List<RuleViolation> verifiedViolations = ruleEngine.suppressUnverified(
			violations,
			extraction.unverifiedFields()
		);
		ContractDiagnosis diagnosis = new ContractDiagnosis(
			extraction.facts(),
			verifiedViolations,
			extraction.unverifiedFields()
		);
		return new ContractDiagnosisContext(diagnosis, documents);
	}
}
