package com.ktb4.aiagent.ocr.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrField;
import java.util.List;
import org.junit.jupiter.api.Test;

class ClovaTextJoinerTests {

	@Test
	void joinsFieldsUsingLineBreakFlag() {
		List<ClovaOcrField> fields = List.of(
			new ClovaOcrField("임금", false),
			new ClovaOcrField("2,000,000원", true),
			new ClovaOcrField("근무지", false)
		);

		String result = ClovaTextJoiner.join(fields);

		assertEquals("임금 2,000,000원\n근무지", result);
	}

	@Test
	void treatsNullLineBreakAsSpace() {
		List<ClovaOcrField> fields = List.of(new ClovaOcrField("텍스트", null));

		assertEquals("텍스트", ClovaTextJoiner.join(fields));
	}

	@Test
	void returnsEmptyStringForEmptyFields() {
		assertEquals("", ClovaTextJoiner.join(List.of()));
	}
}
