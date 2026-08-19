package com.ktb4.aiagent.ocr.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import com.ktb4.aiagent.ocr.exception.ClovaOcrClientException;
import com.ktb4.aiagent.ocr.exception.ClovaOcrUnavailableException;
import java.io.IOException;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class RestClientClovaOcrClientTests {

	private static final String INVOKE_URL = "https://example.com/ocr";

	private ClovaOcrProperties properties(String invokeUrl) {
		return new ClovaOcrProperties("test-secret", invokeUrl, "ko", Duration.ofSeconds(5), Duration.ofSeconds(15));
	}

	private RestClientClovaOcrClient buildClient(MockRestServiceServer[] serverHolder, String invokeUrl) {
		RestClient.Builder builder = RestClient.builder();
		serverHolder[0] = MockRestServiceServer.bindTo(builder).build();
		return new RestClientClovaOcrClient(builder.build(), properties(invokeUrl), new ClovaOcrRequestFactory());
	}

	@Test
	void parsesSuccessfulResponseAndSendsSecretHeader() {
		MockRestServiceServer[] holder = new MockRestServiceServer[1];
		RestClientClovaOcrClient client = buildClient(holder, INVOKE_URL);

		holder[0].expect(requestTo(INVOKE_URL))
			.andExpect(method(HttpMethod.POST))
			.andExpect(header("X-OCR-SECRET", "test-secret"))
			.andRespond(withSuccess("""
				{"images":[{"inferResult":"SUCCESS","fields":[{"inferText":"임금","lineBreak":false}]}]}
				""", MediaType.APPLICATION_JSON));

		ClovaOcrResponse response = client.recognize("bytes".getBytes(), "jpg", "document", "ko");

		assertEquals("임금", response.images().get(0).fields().get(0).inferText());
		holder[0].verify();
	}

	@Test
	void mapsClientErrorResponseToClovaOcrClientException() {
		MockRestServiceServer[] holder = new MockRestServiceServer[1];
		RestClientClovaOcrClient client = buildClient(holder, INVOKE_URL);

		holder[0].expect(requestTo(INVOKE_URL))
			.andRespond(withStatus(HttpStatus.UNAUTHORIZED));

		assertThrows(ClovaOcrClientException.class,
			() -> client.recognize("bytes".getBytes(), "jpg", "document", "ko"));
	}

	@Test
	void mapsIoFailureToClovaOcrUnavailableException() {
		MockRestServiceServer[] holder = new MockRestServiceServer[1];
		RestClientClovaOcrClient client = buildClient(holder, INVOKE_URL);

		holder[0].expect(requestTo(INVOKE_URL))
			.andRespond(request -> {
				throw new IOException("connection reset");
			});

		assertThrows(ClovaOcrUnavailableException.class,
			() -> client.recognize("bytes".getBytes(), "jpg", "document", "ko"));
	}
}
