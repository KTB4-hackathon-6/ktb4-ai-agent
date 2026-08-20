package com.ktb4.aiagent.crosscheck;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.contract.service.ContractDiagnosisService;
import com.ktb4.aiagent.payslip.dto.PayslipDiagnosis;
import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import com.ktb4.aiagent.payslip.service.PayslipDiagnosisService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CrossCheckController.class)
class CrossCheckControllerTests {
	@Autowired MockMvc mvc;
	@MockitoBean ContractDiagnosisService contracts;
	@MockitoBean PayslipDiagnosisService payslips;

	@Test
	void reportsNameMismatchAndPayPeriodOutsideContract() throws Exception {
		when(contracts.diagnose(anyList())).thenReturn(contract("홍길동", "2026-01-01", "2026-03-31", 2_300_000));
		when(payslips.diagnose(anyList())).thenReturn(payslip("김철수", "2026-04", 2_300_000));

		mvc.perform(multipart("/api/employment-documents/cross-check")
				.file(new MockMultipartFile("contractFiles", "contract.jpg", "image/jpeg", new byte[] {1}))
				.file(new MockMultipartFile("payslipFiles", "payslip.jpg", "image/jpeg", new byte[] {1})))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.findings[0].rule_id").value("employee_mismatch"))
			.andExpect(jsonPath("$.data.findings[1].rule_id").value("pay_period_outside_contract"));
	}

	private ContractDiagnosis contract(String name, String start, String end, int wage) {
		return new ContractDiagnosis(new ContractFacts(IndustryCategory.OTHER, 40, 8, 60, true, 1, wage, 11_005,
			true, true, true, 12, true, false, 0, name, start, end), List.of(), List.of());
	}
	private PayslipDiagnosis payslip(String name, String period, int gross) {
		return new PayslipDiagnosis(new PayslipFacts(true, true, true, true, true, gross, 209, 0, 0, 0, 0,
			gross, 0, gross, 0, name, period), List.of(), List.of());
	}
}
