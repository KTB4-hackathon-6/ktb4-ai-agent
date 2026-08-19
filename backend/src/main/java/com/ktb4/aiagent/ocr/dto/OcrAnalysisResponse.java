package com.ktb4.aiagent.ocr.dto;

import java.time.Instant;

public record OcrAnalysisResponse(String documentType, Instant processedAt, String fullText) {
}
