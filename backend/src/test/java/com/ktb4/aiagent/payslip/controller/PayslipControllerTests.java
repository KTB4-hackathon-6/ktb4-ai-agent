package com.ktb4.aiagent.payslip.controller;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.payslip.dto.PayslipDiagnosis;
import com.ktb4.aiagent.payslip.dto.PayslipFacts;
import com.ktb4.aiagent.payslip.dto.PayslipViolation;
import com.ktb4.aiagent.payslip.dto.PayslipViolationSeverity;
import com.ktb4.aiagent.payslip.service.PayslipDiagnosisService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PayslipController.class)
class PayslipControllerTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private PayslipDiagnosisService diagnosisService;

	@Test
	void returnsStructuredPayslipDiagnosis() throws Exception {
		when(diagnosisService.diagnose(anyList())).thenReturn(diagnosis());
		MockMultipartFile payslip = new MockMultipartFile(
			"files", "payslip.jpg", "image/jpeg", "payslip".getBytes());

		mvc.perform(multipart("/api/payslips/diagnose").file(payslip))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.facts.base_pay").value(2_300_000))
			.andExpect(jsonPath("$.data.violations[0].rule_id").value("unclassified_deduction_review"))
			.andExpect(jsonPath("$.data.unverified_fields[0]").value("overtime_pay"));
	}

	private PayslipDiagnosis diagnosis() {
		PayslipFacts facts = new PayslipFacts(
			true, true, true, true, true, 2_300_000, 209,
			0, 0, 0, 0, 2_300_000, 100_000, 2_200_000, 100_000);
		PayslipViolation violation = new PayslipViolation(
			"unclassified_deduction_review", "근로기준법", "제43조",
			"공제 근거를 확인해야 합니다.", PayslipViolationSeverity.REVIEW);
		return new PayslipDiagnosis(facts, List.of(violation), List.of("overtime_pay"));
	}
}
