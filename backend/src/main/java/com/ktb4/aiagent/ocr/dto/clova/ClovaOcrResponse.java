package com.ktb4.aiagent.ocr.dto.clova;

import java.util.List;

public record ClovaOcrResponse(List<ClovaOcrImageResult> images) {
}
