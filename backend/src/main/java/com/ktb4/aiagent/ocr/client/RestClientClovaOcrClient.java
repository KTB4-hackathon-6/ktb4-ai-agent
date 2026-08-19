package com.ktb4.aiagent.ocr.client;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrRequest;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class RestClientClovaOcrClient implements ClovaOcrClient {

	private static final Logger log = LoggerFactory.getLogger(RestClientClovaOcrClient.class);

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
			log.warn("Naver Clova OCR request failed: {}", e.getStatusCode(), e);
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_REQUEST_ERROR);
		} catch (ResourceAccessException e) {
			log.warn("Naver Clova OCR call failed", e);
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_TIMEOUT);
		}
	}
}
