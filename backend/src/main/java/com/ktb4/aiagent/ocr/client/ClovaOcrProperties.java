package com.ktb4.aiagent.ocr.client;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ocr")
public record ClovaOcrProperties(
	String secretKey,
	String invokeUrl,
	String lang,
	Duration connectTimeout,
	Duration readTimeout
) {
}
