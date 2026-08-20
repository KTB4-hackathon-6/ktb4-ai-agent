package com.ktb4.aiagent.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
	"aws.region=ap-northeast-2",
	"aws.s3.bucket-name=test-bucket",
	"aws.s3.originals-prefix=originals/",
	"aws.s3.results-prefix=results/",
	"aws.s3.models-prefix=models/",
	"aws.s3.presigned-expires-seconds=600"
})
@AutoConfigureMockMvc
class OpenApiDocumentationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void exposesConfiguredOpenApiDocumentForCurrentEndpoints() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.info.title").value("노동나침반 API"))
			.andExpect(jsonPath("$.info.version").value("v1"))
			.andExpect(jsonPath("$.paths['/api/documents/ocr'].post").exists())
			.andExpect(jsonPath("$.paths['/api/documents/ocr'].post.summary").value("문서 OCR 분석"))
			.andExpect(jsonPath("$.paths['/api/documents/ocr'].post.parameters").doesNotExist())
			.andExpect(jsonPath("$.paths['/api/contracts/diagnose'].post").exists())
			.andExpect(jsonPath("$.paths['/api/contracts/diagnose'].post.summary")
				.value("근로계약서 OCR 및 진단"))
			.andExpect(jsonPath("$.paths['/api/contracts/analyze'].post").exists())
			.andExpect(jsonPath("$.paths['/api/contracts/analyze'].post.summary")
				.value("근로계약서 OCR·진단 및 AI 검토"))
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/contract-analyses'].post.summary")
				.value("비동기 근로계약서 분석 시작"))
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/contract-analyses/{analysisId}'].get.summary")
				.value("근로계약서 분석 진행 상태 조회"))
			.andExpect(jsonPath("$.paths['/api/sessions'].post").exists())
			.andExpect(jsonPath("$.paths['/api/sessions'].post.summary").value("임시 상담 세션 생성"))
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/messages'].get").exists())
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/messages'].post").doesNotExist())
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/chat'].post").exists())
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/chat'].post.summary")
				.value("상담 메시지 분석 및 AI 답변 생성"))
			.andExpect(jsonPath("$.components.schemas.Analysis.properties.documentDrafts").doesNotExist())
			.andExpect(jsonPath("$.components.schemas.ChatExchange.properties.analysis['$ref']")
				.value("#/components/schemas/Analysis"))
			.andExpect(jsonPath("$.components.schemas.ContractAnalysisResponse.properties.analysis['$ref']")
				.value("#/components/schemas/Analysis"));
	}

	@Test
	void exposesSwaggerUi() throws Exception {
		mockMvc.perform(get("/swagger-ui/index.html"))
			.andExpect(status().isOk());
	}
}
