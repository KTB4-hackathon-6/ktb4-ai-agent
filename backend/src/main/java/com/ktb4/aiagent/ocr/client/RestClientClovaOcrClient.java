package com.ktb4.aiagent.ocr.client;

import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrRequest;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import com.ktb4.aiagent.ocr.exception.ClovaOcrClientException;
import com.ktb4.aiagent.ocr.exception.ClovaOcrUnavailableException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class RestClientClovaOcrClient implements ClovaOcrClient {

	private final RestClient restClient;
	private final ClovaOcrProperties properties;
	private final ClovaOcrRequestFactory requestFactory;

	public RestClientClovaOcrClient(RestClient clovaOcrRestClient, ClovaOcrProperties properties,
			ClovaOcrRequestFactory requestFactory) {
		this.restClient = clovaOcrRestClient;
		this.properties = properties;
		this.requestFactory = requestFactory;
	}

	@Override
	public ClovaOcrResponse recognize(byte[] imageBytes, String format, String fileName, String lang) {
		ClovaOcrRequest request = requestFactory.create(imageBytes, format, fileName, lang);
		try {
			return restClient.post()
				.uri(properties.invokeUrl())
				.header("X-OCR-SECRET", properties.secretKey())
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.retrieve()
				.body(ClovaOcrResponse.class);
		} catch (RestClientResponseException e) {
			throw new ClovaOcrClientException("Naver Clova OCR 요청이 실패했습니다: " + e.getStatusCode(), e);
		} catch (ResourceAccessException e) {
			throw new ClovaOcrUnavailableException("Naver Clova OCR 호출에 실패했습니다", e);
		}
	}
}
