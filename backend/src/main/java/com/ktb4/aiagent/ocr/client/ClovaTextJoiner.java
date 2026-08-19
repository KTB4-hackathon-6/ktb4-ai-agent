package com.ktb4.aiagent.ocr.client;

import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrField;
import java.util.List;

public final class ClovaTextJoiner {

	private ClovaTextJoiner() {
	}

	public static String join(List<ClovaOcrField> fields) {
		StringBuilder builder = new StringBuilder();
		for (ClovaOcrField field : fields) {
			builder.append(field.inferText());
			builder.append(Boolean.TRUE.equals(field.lineBreak()) ? "\n" : " ");
		}
		return builder.toString().strip();
	}
}
