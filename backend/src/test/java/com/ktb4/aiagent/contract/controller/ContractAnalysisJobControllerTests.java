package com.ktb4.aiagent.contract.controller;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ktb4.aiagent.contract.dto.ContractAnalysisJobResponse;
import com.ktb4.aiagent.contract.service.ContractAnalysisJobService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ContractAnalysisJobController.class)
class ContractAnalysisJobControllerTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private ContractAnalysisJobService jobService;

	@Test
	void startsAnalysisJobAndReturnsAccepted() throws Exception {
		when(jobService.start(eq("session-001"), eq("계약서를 설명해줘"), anyList()))
			.thenReturn(processing());
		MockMultipartFile file = new MockMultipartFile(
			"files", "contract.pdf", "application/pdf", "pdf".getBytes()
		);

		mvc.perform(multipart("/api/sessions/session-001/contract-analyses")
				.file(file)
				.param("text", "계약서를 설명해줘"))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.data.analysisId").value("analysis-001"))
			.andExpect(jsonPath("$.data.status").value("PROCESSING"))
			.andExpect(jsonPath("$.data.stage").value("OCR"))
			.andExpect(jsonPath("$.data.processedFiles").value(0))
			.andExpect(jsonPath("$.data.totalFiles").value(2));
	}

	@Test
	void returnsCurrentAnalysisProgress() throws Exception {
		when(jobService.get("session-001", "analysis-001")).thenReturn(new ContractAnalysisJobResponse(
			"analysis-001",
			ContractAnalysisJobResponse.Status.PROCESSING,
			ContractAnalysisJobResponse.Stage.STRUCTURING,
			2,
			2,
			null,
			null
		));

		mvc.perform(get("/api/sessions/session-001/contract-analyses/analysis-001"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.stage").value("STRUCTURING"))
			.andExpect(jsonPath("$.data.processedFiles").value(2));
	}

	private ContractAnalysisJobResponse processing() {
		return new ContractAnalysisJobResponse(
			"analysis-001",
			ContractAnalysisJobResponse.Status.PROCESSING,
			ContractAnalysisJobResponse.Stage.OCR,
			0,
			2,
			null,
			null
		);
	}
}
