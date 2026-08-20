package com.ktb4.aiagent.payslip.extraction;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

@Component
public class DeepSeekPayslipFactExtractionClient implements PayslipFactExtractionClient {

	private static final String SYSTEM_PROMPT = """
		너는 대한민국 급여명세서 OCR 결과에서 정해진 필드를 그대로 읽어 JSON으로 구조화하는 도구다.
		법 위반 여부는 절대 판단하지 않는다. 문서에 없는 항목은 관련 *_specified를 false, 수치를 0으로 둔다.
		base_pay는 기본급 항목만, gross_pay는 총지급액, total_deductions는 총공제액, net_pay는 실수령액을 읽는다.
		regular_working_hours는 해당 급여기간의 기본급 산정 기준 근로시간이 명시된 경우만 반환한다.
		연장·야간·휴일 근로시간 또는 해당 수당이 없으면 각각 0으로 둔다.
		unclassified_deduction은 항목명이나 근거 없이 공제된 금액의 합계다.
		employee_name은 근로자 성명을 그대로 읽고, pay_period는 귀속월을 YYYY-MM 형식으로 반환한다. 확인할 수 없으면 빈 문자열이다.
		반드시 아래 키만 가진 유효한 json 객체를 반환한다.
		{"pay_period_specified":false,"payment_date_specified":false,"wage_components_specified":false,
		"calculation_method_specified":false,"deductions_specified":false,"base_pay":0,
		"regular_working_hours":0,"overtime_hours":0,"overtime_pay":0,"night_pay":0,"holiday_pay":0,
		"gross_pay":0,"total_deductions":0,"net_pay":0,"unclassified_deduction":0,"employee_name":"","pay_period":""}
		""";
	private static final Set<String> REQUIRED_FIELDS = Set.of(
		"pay_period_specified", "payment_date_specified", "wage_components_specified",
		"calculation_method_specified", "deductions_specified", "base_pay", "regular_working_hours",
		"overtime_hours", "overtime_pay", "night_pay", "holiday_pay", "gross_pay",
		"total_deductions", "net_pay", "unclassified_deduction", "employee_name", "pay_period"
	);

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String apiKey;
	private final String model;

	@Autowired
	public DeepSeekPayslipFactExtractionClient(
			@Value("${app.contract-extraction.base-url}") String baseUrl,
			@Value("${app.contract-extraction.connect-timeout}") Duration connectTimeout,
			@Value("${app.contract-extraction.read-timeout}") Duration readTimeout,
			@Value("${app.contract-extraction.api-key}") String apiKey,
			@Value("${app.contract-extraction.model}") String model,
			ObjectMapper objectMapper) {
		this(createRestClient(baseUrl, connectTimeout, readTimeout), objectMapper, apiKey, model);
	}

	DeepSeekPayslipFactExtractionClient(RestClient restClient, ObjectMapper objectMapper, String apiKey, String model) {
		this.restClient = Objects.requireNonNull(restClient);
		this.objectMapper = Objects.requireNonNull(objectMapper);
		this.apiKey = apiKey;
		this.model = model;
	}

	@Override
	public ExtractedPayslipFacts extract(String rawText) {
		if (apiKey == null || apiKey.isBlank() || model == null || model.isBlank()) {
			throw new ApplicationException(ErrorCode.CONTRACT_EXTRACTION_FAILED);
		}
		try {
			ChatCompletionResponse response = restClient.post().uri("/chat/completions")
				.contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + apiKey)
				.body(requestBody(rawText)).retrieve().body(ChatCompletionResponse.class);
			String content = responseContent(response);
			Map<?, ?> fields = objectMapper.readValue(content, Map.class);
			if (!fields.keySet().containsAll(REQUIRED_FIELDS)) {
				throw new IllegalArgumentException("DeepSeek response is missing required payslip fields");
			}
			ExtractedPayslipFacts facts = objectMapper.convertValue(fields, ExtractedPayslipFacts.class);
			validate(facts);
			return facts;
		}
		catch (Exception exception) {
			throw new ApplicationException(ErrorCode.CONTRACT_EXTRACTION_FAILED);
		}
	}

	private Map<String, Object> requestBody(String rawText) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("model", model);
		request.put("messages", List.of(Map.of("role", "system", "content", SYSTEM_PROMPT),
			Map.of("role", "user", "content", rawText)));
		request.put("response_format", Map.of("type", "json_object"));
		request.put("thinking", Map.of("type", "disabled"));
		return request;
	}

	private String responseContent(ChatCompletionResponse response) {
		if (response == null || response.choices() == null || response.choices().isEmpty()
				|| response.choices().getFirst().message() == null
				|| response.choices().getFirst().message().content() == null
				|| response.choices().getFirst().message().content().isBlank()) {
			throw new IllegalArgumentException("DeepSeek response content is empty");
		}
		return response.choices().getFirst().message().content();
	}

	private void validate(ExtractedPayslipFacts facts) {
		if (facts.basePay() < 0 || facts.regularWorkingHours() < 0 || facts.overtimeHours() < 0
				|| facts.overtimePay() < 0 || facts.nightPay() < 0 || facts.holidayPay() < 0
				|| facts.grossPay() < 0 || facts.totalDeductions() < 0 || facts.netPay() < 0
				|| facts.unclassifiedDeduction() < 0) {
			throw new IllegalArgumentException("DeepSeek response contains invalid payslip facts");
		}
	}

	private static RestClient createRestClient(String baseUrl, Duration connectTimeout, Duration readTimeout) {
		HttpClient httpClient = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
			.connectTimeout(connectTimeout).build();
		JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
		factory.setReadTimeout(readTimeout);
		return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
	}

	private record ChatCompletionResponse(List<Choice> choices) { }
	private record Choice(Message message) { }
	private record Message(String content) { }
}
