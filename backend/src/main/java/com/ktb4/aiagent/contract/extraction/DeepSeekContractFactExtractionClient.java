package com.ktb4.aiagent.contract.extraction;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;

@Component
public class DeepSeekContractFactExtractionClient implements ContractFactExtractionClient {

	private static final Logger log = LoggerFactory.getLogger(DeepSeekContractFactExtractionClient.class);
	private static final String SYSTEM_PROMPT = """
		너는 대한민국 표준근로계약서 OCR 결과에서 정해진 필드를 그대로 읽어 JSON으로 구조화하는 도구다.
		법 위반 여부는 절대 판단하지 않는다. 계약서에 없는 항목은 관련 *_specified를 false, 수치를 0으로 둔다.
		monthly_wage는 계산하지 말고 계약서에 적힌 월급을 그대로 읽는다.
		휴게시간이 시와 분으로 나뉘면 합산해 분 단위로 반환한다.
		payment_method_in_person은 통장 입금이 아니라 현금 직접 지급에 체크된 경우에만 true다.
		반드시 아래 키만 가진 유효한 json 객체를 반환한다.
		{"industry":"manufacturing|agriculture_livestock_fishery|other","weekly_working_hours":0,
		"daily_working_hours":0,"rest_minutes_per_workday":0,"weekly_paid_holidays":0,
		"monthly_wage":0,"wage_specified":false,"working_hours_specified":false,
		"holiday_specified":false,"contract_period_months":0,"payment_date_specified":false,
		"payment_method_in_person":false,"accommodation_deduction_krw":0}
		""";
	private static final Set<String> REQUIRED_FIELDS = Set.of(
		"industry",
		"weekly_working_hours",
		"daily_working_hours",
		"rest_minutes_per_workday",
		"weekly_paid_holidays",
		"monthly_wage",
		"wage_specified",
		"working_hours_specified",
		"holiday_specified",
		"contract_period_months",
		"payment_date_specified",
		"payment_method_in_person",
		"accommodation_deduction_krw"
	);

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String apiKey;
	private final String model;

	@Autowired
	public DeepSeekContractFactExtractionClient(
			@Value("${app.contract-extraction.base-url}") String baseUrl,
			@Value("${app.contract-extraction.connect-timeout}") Duration connectTimeout,
			@Value("${app.contract-extraction.read-timeout}") Duration readTimeout,
			@Value("${app.contract-extraction.api-key}") String apiKey,
			@Value("${app.contract-extraction.model}") String model,
			ObjectMapper objectMapper) {
		this(createRestClient(baseUrl, connectTimeout, readTimeout), objectMapper, apiKey, model);
	}

	DeepSeekContractFactExtractionClient(
			RestClient restClient,
			ObjectMapper objectMapper,
			String apiKey,
			String model) {
		this.restClient = Objects.requireNonNull(restClient, "Rest client must not be null");
		this.objectMapper = Objects.requireNonNull(objectMapper, "Object mapper must not be null");
		this.apiKey = apiKey;
		this.model = model;
	}

	@Override
	public ExtractedContractFacts extract(String rawText) {
		if (apiKey == null || apiKey.isBlank() || model == null || model.isBlank()) {
			log.warn("Contract extraction configuration is missing");
			throw new ApplicationException(ErrorCode.CONTRACT_EXTRACTION_FAILED);
		}

		try {
			ChatCompletionResponse response = restClient.post()
				.uri("/chat/completions")
				.contentType(MediaType.APPLICATION_JSON)
				.header("Authorization", "Bearer " + apiKey)
				.body(requestBody(rawText))
				.retrieve()
				.body(ChatCompletionResponse.class);
			String content = responseContent(response);
			Map<?, ?> fields = objectMapper.readValue(content, Map.class);
			if (!fields.keySet().containsAll(REQUIRED_FIELDS)) {
				throw new IllegalArgumentException("DeepSeek response is missing required fields");
			}
			ExtractedContractFacts facts = objectMapper.convertValue(fields, ExtractedContractFacts.class);
			validate(facts);
			return facts;
		}
		catch (RestClientException exception) {
			log.warn("DeepSeek contract extraction request failed", exception);
			throw new ApplicationException(ErrorCode.CONTRACT_EXTRACTION_FAILED);
		}
		catch (Exception exception) {
			log.warn("DeepSeek contract extraction response was invalid", exception);
			throw new ApplicationException(ErrorCode.CONTRACT_EXTRACTION_FAILED);
		}
	}

	private void validate(ExtractedContractFacts facts) {
		if (facts.industry() == null
				|| facts.weeklyWorkingHours() < 0
				|| facts.dailyWorkingHours() < 0
				|| facts.restMinutesPerWorkday() < 0
				|| facts.weeklyPaidHolidays() < 0
				|| facts.monthlyWage() < 0
				|| facts.contractPeriodMonths() < 0
				|| facts.accommodationDeductionKrw() < 0) {
			throw new IllegalArgumentException("DeepSeek response contains invalid contract facts");
		}
	}

	private Map<String, Object> requestBody(String rawText) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("model", model);
		request.put("messages", List.of(
			Map.of("role", "system", "content", SYSTEM_PROMPT),
			Map.of("role", "user", "content", rawText)
		));
		request.put("response_format", Map.of("type", "json_object"));
		request.put("thinking", Map.of("type", "disabled"));
		return request;
	}

	private String responseContent(ChatCompletionResponse response) {
		if (response == null || response.choices() == null || response.choices().isEmpty()) {
			throw new IllegalArgumentException("DeepSeek response has no choices");
		}
		Choice choice = response.choices().getFirst();
		if (choice.message() == null
				|| choice.message().content() == null
				|| choice.message().content().isBlank()) {
			throw new IllegalArgumentException("DeepSeek response content is empty");
		}
		return choice.message().content();
	}

	private static RestClient createRestClient(
			String baseUrl,
			Duration connectTimeout,
			Duration readTimeout) {
		if (baseUrl == null || baseUrl.isBlank()) {
			throw new IllegalArgumentException("DeepSeek base URL must not be blank");
		}
		if (connectTimeout == null || connectTimeout.isZero() || connectTimeout.isNegative()) {
			throw new IllegalArgumentException("DeepSeek connect timeout must be positive");
		}
		if (readTimeout == null || readTimeout.isZero() || readTimeout.isNegative()) {
			throw new IllegalArgumentException("DeepSeek read timeout must be positive");
		}

		HttpClient httpClient = HttpClient.newBuilder()
			.version(HttpClient.Version.HTTP_1_1)
			.connectTimeout(connectTimeout)
			.build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(readTimeout);
		return RestClient.builder()
			.baseUrl(baseUrl)
			.requestFactory(requestFactory)
			.build();
	}

	private record ChatCompletionResponse(List<Choice> choices) {
	}

	private record Choice(Message message) {
	}

	private record Message(String content) {
	}
}
