package com.ktb4.aiagent.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.io.InputStream;
import org.junit.jupiter.api.Test;

class AnalysisOutcomeContractTests {

	private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

	@Test
	void deserializesSharedReadyLaborComplaintFixture() throws Exception {
		DocumentPreparationOutcome outcome = readOutcome(readFixture());

		AnalysisOutcome.DocumentDraft draft = outcome.documentDrafts().getFirst();
		assertThat(outcome.answer()).isEqualTo("진정서 초안을 준비했습니다.");
		assertThat(draft.status()).isEqualTo(AnalysisOutcome.DocumentDraftStatus.READY);
		assertThat(draft.data().complainant().fullName()).isEqualTo("NGUYEN VAN TEST");
		assertThat(draft.data().complaint().unpaidWagesTotal()).isEqualTo(406_923L);
	}

	@Test
	void rejectsReadyDraftWhenRequiredFieldIsMissing() throws Exception {
		JsonNode response = readFixture();
		((ObjectNode) firstDraft(response).path("data").path("complainant"))
			.putNull("fullName");

		assertThatThrownBy(() -> readOutcome(response))
			.hasRootCauseInstanceOf(IllegalArgumentException.class)
			.rootCause()
			.hasMessageContaining("complainant.fullName");
	}

	private DocumentPreparationOutcome readOutcome(JsonNode response) throws IOException {
		return objectMapper.treeToValue(response.path("result"), DocumentPreparationOutcome.class);
	}

	private JsonNode readFixture() throws IOException {
		try (InputStream input = getClass().getResourceAsStream(
			"/analysis/labor-complaint-ready.json"
		)) {
			if (input == null) {
				throw new IllegalStateException("Shared analysis fixture is missing");
			}
			return objectMapper.readTree(input);
		}
	}

	private ObjectNode firstDraft(JsonNode response) {
		return (ObjectNode) response.path("result")
			.path("documentDrafts")
			.get(0);
	}
}
