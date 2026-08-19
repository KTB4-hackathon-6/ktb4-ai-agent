package com.ktb4.aiagent.ocr.dto.clova;

import java.util.List;

public record ClovaOcrImageResult(String inferResult, String message, List<ClovaOcrField> fields) {
}
