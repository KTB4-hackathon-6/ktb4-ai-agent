package com.ktb4.aiagent.payslip.service;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.ocr.service.OcrService;
import com.ktb4.aiagent.payslip.dto.PayslipDiagnosis;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PayslipDiagnosisService {

	private final OcrService ocrService;
	private final PayslipFactExtractor factExtractor;
	private final PayslipRuleEngine ruleEngine;

	public PayslipDiagnosisService(
			OcrService ocrService,
			PayslipFactExtractor factExtractor,
			PayslipRuleEngine ruleEngine) {
		this.ocrService = ocrService;
		this.factExtractor = factExtractor;
		this.ruleEngine = ruleEngine;
	}

	public PayslipDiagnosis diagnose(List<MultipartFile> files) {
		if (files == null || files.isEmpty()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		String rawText = ocrService.analyzeAll(files).stream()
			.map(result -> result.fullText())
			.reduce((first, second) -> first + "\n\n" + second)
			.orElseThrow(() -> new ApplicationException(ErrorCode.INVALID_REQUEST));
		PayslipExtraction extraction = factExtractor.extract(rawText);
		return new PayslipDiagnosis(extraction.facts(), ruleEngine.suppressUnverified(
			ruleEngine.check(extraction.facts()), extraction.unverifiedFields()), extraction.unverifiedFields());
	}
}
