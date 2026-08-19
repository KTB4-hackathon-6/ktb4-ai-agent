package com.ktb4.aiagent.ocr.dto;

import java.time.Instant;

public record OcrAnalysisResponse(Instant processedAt, String fullText) {
}
