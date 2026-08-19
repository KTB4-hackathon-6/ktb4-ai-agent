package com.ktb4.aiagent.ocr.client;

import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;

public interface ClovaOcrClient {

	ClovaOcrResponse recognize(byte[] imageBytes, String format, String fileName, String lang);
}
