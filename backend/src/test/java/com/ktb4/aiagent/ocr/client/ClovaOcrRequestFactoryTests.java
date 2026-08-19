package com.ktb4.aiagent.ocr.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrRequest;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class ClovaOcrRequestFactoryTests {

	private final ClovaOcrRequestFactory factory = new ClovaOcrRequestFactory();

	@Test
	void encodesImageBytesAsBase64AndFillsMetadata() {
		byte[] bytes = "fake-image-bytes".getBytes();

		ClovaOcrRequest request = factory.create(bytes, "jpg", "document", "ko");

		assertEquals("V2", request.version());
		assertEquals("ko", request.lang());
		assertEquals(1, request.images().size());
		assertEquals("jpg", request.images().get(0).format());
		assertEquals("document", request.images().get(0).name());
		assertEquals(Base64.getEncoder().encodeToString(bytes), request.images().get(0).data());
	}

	@Test
	void generatesUniqueRequestIdPerCall() {
		ClovaOcrRequest first = factory.create(new byte[] {1}, "png", "document", "ko");
		ClovaOcrRequest second = factory.create(new byte[] {1}, "png", "document", "ko");

		assertEquals(false, first.requestId().equals(second.requestId()));
	}
}
