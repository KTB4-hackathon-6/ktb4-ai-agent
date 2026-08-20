package com.ktb4.aiagent.crosscheck;

import com.ktb4.aiagent.common.web.ApiResponse;
import com.ktb4.aiagent.contract.service.ContractDiagnosisService;
import com.ktb4.aiagent.payslip.service.PayslipDiagnosisService;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/employment-documents")
public class CrossCheckController {
	private final ContractDiagnosisService contracts;
	private final PayslipDiagnosisService payslips;
	public CrossCheckController(ContractDiagnosisService contracts, PayslipDiagnosisService payslips) { this.contracts = contracts; this.payslips = payslips; }
	@PostMapping("/cross-check")
	public ApiResponse<CrossCheckResult> crossCheck(@RequestPart("contractFiles") List<MultipartFile> contractFiles,
			@RequestPart("payslipFiles") List<MultipartFile> payslipFiles) {
		var contract = contracts.diagnose(contractFiles).facts(); var payslip = payslips.diagnose(payslipFiles).facts();
		var findings = new java.util.ArrayList<CrossCheckFinding>();
		if (contract.employeeName().isBlank() || payslip.employeeName().isBlank()) findings.add(finding("comparison_not_available", "확인 필요", "근로자명을 확인할 수 없어 문서 대조를 보류합니다.", "REVIEW"));
		else if (!contract.employeeName().equals(payslip.employeeName())) findings.add(finding("employee_mismatch", "근로기준법", "근로계약서와 급여명세서의 근로자명이 일치하지 않습니다.", "WARNING"));
		addPayPeriodFinding(findings, contract.contractStartDate(), contract.contractEndDate(), payslip.payPeriod());
		if (contract.monthlyWage() > 0 && payslip.grossPay() > 0 && contract.monthlyWage() != payslip.grossPay()) findings.add(finding("agreed_wage_mismatch_review", "근로기준법 제43조", "약정 월급과 명세서 총지급액이 달라 연장·상여 등 지급 사유를 확인해야 합니다.", "REVIEW"));
		return ApiResponse.success(new CrossCheckResult(contract.employeeName(), payslip.employeeName(), payslip.payPeriod(), findings));
	}
	private void addPayPeriodFinding(List<CrossCheckFinding> findings, String start, String end, String payPeriod) {
		try {
			if (start == null || start.isBlank() || end == null || end.isBlank() || payPeriod == null || payPeriod.isBlank()) {
				findings.add(finding("comparison_not_available", "확인 필요", "계약기간 또는 명세서 귀속월을 확인할 수 없습니다.", "REVIEW")); return;
			}
			YearMonth month = YearMonth.parse(payPeriod.substring(0, 7));
			if (month.isBefore(YearMonth.from(LocalDate.parse(start))) || month.isAfter(YearMonth.from(LocalDate.parse(end)))) {
				findings.add(finding("pay_period_outside_contract", "근로기준법 제17조", "명세서 귀속월이 계약기간 밖에 있습니다.", "WARNING"));
			}
		} catch (RuntimeException exception) { findings.add(finding("comparison_not_available", "확인 필요", "계약기간 또는 명세서 귀속월 형식을 확인할 수 없습니다.", "REVIEW")); }
	}
	private CrossCheckFinding finding(String id, String law, String message, String severity) { return new CrossCheckFinding(id, law, message, severity); }
}
