package com.ktb4.aiagent.ocr.dto.clova;

import java.util.List;

public record ClovaOcrRequest(
	String version,
	String requestId,
	long timestamp,
	String lang,
	List<ClovaImage> images
) {
}
