package com.ktb4.aiagent.contract.extraction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

class DeepSeekContractFactExtractionClientTests {

	private static final String BASE_URL = "https://api.deepseek.com";

	private MockRestServiceServer server;
	private DeepSeekContractFactExtractionClient client;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		client = new DeepSeekContractFactExtractionClient(
			builder.baseUrl(BASE_URL).build(),
			new ObjectMapper(),
			"test-key",
			"deepseek-chat"
		);
	}

	@Test
	void requestsJsonOutputAndParsesStructuredContractFacts() {
		server.expect(requestTo(BASE_URL + "/chat/completions"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(header("Authorization", "Bearer test-key"))
			.andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(content().json("""
				{
				  "model": "deepseek-chat",
				  "response_format": {"type": "json_object"},
				  "thinking": {"type": "disabled"}
				}
				""", JsonCompareMode.LENIENT))
			.andRespond(withSuccess("""
				{
				  "choices": [{
				    "message": {
				      "content": "{\\"industry\\":\\"manufacturing\\",\\"weekly_working_hours\\":45,\\"daily_working_hours\\":8,\\"rest_minutes_per_workday\\":60,\\"weekly_paid_holidays\\":1,\\"monthly_wage\\":2300000,\\"wage_specified\\":true,\\"working_hours_specified\\":true,\\"holiday_specified\\":true,\\"contract_period_months\\":36,\\"payment_date_specified\\":true,\\"payment_method_in_person\\":false,\\"accommodation_deduction_krw\\":80000}"
				    }
				  }]
				}
				""", MediaType.APPLICATION_JSON));

		ExtractedContractFacts facts = client.extract("OCR 원문");

		assertThat(facts.monthlyWage()).isEqualTo(2_300_000);
		assertThat(facts.restMinutesPerWorkday()).isEqualTo(60);
		server.verify();
	}

	@Test
	void mapsProviderFailureToContractExtractionError() {
		server.expect(requestTo(BASE_URL + "/chat/completions"))
			.andRespond(withStatus(HttpStatus.BAD_GATEWAY));

		assertThatThrownBy(() -> client.extract("OCR 원문"))
			.isInstanceOf(ApplicationException.class)
			.extracting(exception -> ((ApplicationException) exception).errorCode())
			.isEqualTo(ErrorCode.CONTRACT_EXTRACTION_FAILED);
	}

	@Test
	void rejectsJsonMissingRequiredContractFields() {
		server.expect(requestTo(BASE_URL + "/chat/completions"))
			.andRespond(withSuccess("""
				{
				  "choices": [{"message": {"content": "{\\"industry\\":\\"manufacturing\\"}"}}]
				}
				""", MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> client.extract("OCR 원문"))
			.isInstanceOf(ApplicationException.class)
			.extracting(exception -> ((ApplicationException) exception).errorCode())
			.isEqualTo(ErrorCode.CONTRACT_EXTRACTION_FAILED);
	}
}
