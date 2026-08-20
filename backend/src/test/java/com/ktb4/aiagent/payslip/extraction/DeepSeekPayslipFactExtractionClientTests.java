package com.ktb4.aiagent.payslip.extraction;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

class DeepSeekPayslipFactExtractionClientTests {

	private static final String BASE_URL = "https://api.deepseek.com";

	private MockRestServiceServer server;
	private DeepSeekPayslipFactExtractionClient client;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		client = new DeepSeekPayslipFactExtractionClient(
			builder.baseUrl(BASE_URL).build(),
			new ObjectMapper(),
			"test-key",
			"deepseek-chat"
		);
	}

	@Test
	void rejectsUnrelatedDocumentBeforeReturningStructuredFacts() {
		server.expect(requestTo(BASE_URL + "/chat/completions"))
			.andRespond(withSuccess("""
				{
				  "choices": [{
				    "message": {
				      "content": "{\\"document_type\\":\\"other\\",\\"pay_period_specified\\":false,\\"payment_date_specified\\":false,\\"wage_components_specified\\":false,\\"calculation_method_specified\\":false,\\"deductions_specified\\":false,\\"base_pay\\":0,\\"regular_working_hours\\":0,\\"overtime_hours\\":0,\\"overtime_pay\\":0,\\"night_pay\\":0,\\"holiday_pay\\":0,\\"gross_pay\\":0,\\"total_deductions\\":0,\\"net_pay\\":0,\\"unclassified_deduction\\":0,\\"employee_name\\":\\"\\",\\"pay_period\\":\\"\\"}"
				    }
				  }]
				}
				""", MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> client.extract("관광지 안내문"))
			.isInstanceOf(ApplicationException.class)
			.extracting(exception -> ((ApplicationException) exception).errorCode())
			.isEqualTo(ErrorCode.UNRELATED_DOCUMENT);
	}
}
