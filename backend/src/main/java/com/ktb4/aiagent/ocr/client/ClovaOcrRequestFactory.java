package com.ktb4.aiagent.ocr.client;

import com.ktb4.aiagent.ocr.dto.clova.ClovaImage;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrRequest;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ClovaOcrRequestFactory {

	public ClovaOcrRequest create(byte[] imageBytes, String format, String fileName, String lang) {
		String data = Base64.getEncoder().encodeToString(imageBytes);
		ClovaImage image = new ClovaImage(format, fileName, data);
		return new ClovaOcrRequest(
			"V2",
			UUID.randomUUID().toString(),
			System.currentTimeMillis(),
			lang,
			List.of(image)
		);
	}
}
