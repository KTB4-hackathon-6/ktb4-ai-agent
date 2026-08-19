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
			.andExpect(jsonPath("$.paths['/api/sessions'].post").exists())
			.andExpect(jsonPath("$.paths['/api/sessions'].post.summary").value("임시 상담 세션 생성"))
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/messages'].get").exists())
			.andExpect(jsonPath("$.paths['/api/sessions/{sessionId}/messages'].post").exists());
	}

	@Test
	void exposesSwaggerUi() throws Exception {
		mockMvc.perform(get("/swagger-ui/index.html"))
			.andExpect(status().isOk());
	}
}
