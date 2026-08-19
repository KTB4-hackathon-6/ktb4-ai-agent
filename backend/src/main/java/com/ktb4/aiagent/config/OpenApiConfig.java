package com.ktb4.aiagent.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI laborCompassOpenApi() {
		return new OpenAPI()
			.info(new Info()
				.title("노동나침반 API")
				.description("외국인 근로자를 위한 계약서 진단·대응 에이전트 API")
				.version("v1"));
	}
}
