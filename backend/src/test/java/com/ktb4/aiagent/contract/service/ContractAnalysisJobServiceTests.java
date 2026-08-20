package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ktb4.aiagent.analysis.AnalysisOutcome;
import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.contract.dto.ContractAnalysisJobResponse;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import com.ktb4.aiagent.contract.dto.ContractDiagnosis;
import com.ktb4.aiagent.contract.dto.ContractFacts;
import com.ktb4.aiagent.contract.dto.IndustryCategory;
import com.ktb4.aiagent.ocr.service.OcrRequestValidator;
import com.ktb4.aiagent.session.MessageRole;
import com.ktb4.aiagent.session.SessionMessage;
import com.ktb4.aiagent.session.SessionMessageService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.mock.web.MockMultipartFile;

class ContractAnalysisJobServiceTests {

	@Test
	void completesJobWithActualStageTransitions() {
		ContractAnalysisService analysisService = mock(ContractAnalysisService.class);
		SessionMessageService messageService = mock(SessionMessageService.class);
		InMemoryContractAnalysisJobStore store = store();
		when(analysisService.analyze(any(), any(), anyList(), any())).thenAnswer(invocation -> {
			ContractAnalysisProgressListener listener = invocation.getArgument(3);
			listener.onOcrProgress(1, 2);
			listener.onOcrProgress(2, 2);
			listener.onStructuring();
			listener.onGeneratingResponse();
			return response();
		});
		ContractAnalysisJobService service = new ContractAnalysisJobService(
			analysisService,
			messageService,
			new OcrRequestValidator(),
			store,
			new SyncTaskExecutor(),
			Duration.ofMinutes(30),
			() -> "analysis-001"
		);

		ContractAnalysisJobResponse started = service.start(
			"session-001",
			"계약서를 설명해줘",
			List.of(file("front.pdf"), file("back.pdf"))
		);
		ContractAnalysisJobResponse completed = service.get("session-001", started.analysisId());

		assertThat(completed.status()).isEqualTo(ContractAnalysisJobResponse.Status.COMPLETED);
		assertThat(completed.stage()).isEqualTo(ContractAnalysisJobResponse.Stage.COMPLETED);
		assertThat(completed.processedFiles()).isEqualTo(2);
		assertThat(completed.totalFiles()).isEqualTo(2);
		assertThat(completed.result()).isEqualTo(response());
		assertThat(completed.error()).isNull();
	}

	@Test
	void preservesFailedStageAndApplicationError() {
		ContractAnalysisService analysisService = mock(ContractAnalysisService.class);
		SessionMessageService messageService = mock(SessionMessageService.class);
		when(analysisService.analyze(any(), any(), anyList(), any())).thenAnswer(invocation -> {
			ContractAnalysisProgressListener listener = invocation.getArgument(3);
			listener.onStructuring();
			throw new ApplicationException(ErrorCode.CONTRACT_EXTRACTION_FAILED);
		});
		ContractAnalysisJobService service = new ContractAnalysisJobService(
			analysisService,
			messageService,
			new OcrRequestValidator(),
			store(),
			new SyncTaskExecutor(),
			Duration.ofMinutes(30),
			() -> "analysis-002"
		);

		ContractAnalysisJobResponse started = service.start(
			"session-001",
			"계약서를 설명해줘",
			List.of(file("contract.pdf"))
		);
		ContractAnalysisJobResponse failed = service.get("session-001", started.analysisId());

		assertThat(failed.status()).isEqualTo(ContractAnalysisJobResponse.Status.FAILED);
		assertThat(failed.stage()).isEqualTo(ContractAnalysisJobResponse.Stage.STRUCTURING);
		assertThat(failed.error().code()).isEqualTo("CONTRACT_EXTRACTION_FAILED");
		assertThat(failed.result()).isNull();
	}

	@Test
	void rejectsJobWhenAnalysisQueueIsFull() {
		ContractAnalysisJobService service = new ContractAnalysisJobService(
			mock(ContractAnalysisService.class),
			mock(SessionMessageService.class),
			new OcrRequestValidator(),
			store(),
			task -> { throw new TaskRejectedException("queue full"); },
			Duration.ofMinutes(30),
			() -> "analysis-003"
		);

		assertThatThrownBy(() -> service.start(
			"session-001",
			"계약서를 설명해줘",
			List.of(file("contract.pdf"))
		))
			.isInstanceOfSatisfying(ApplicationException.class, exception ->
				assertThat(exception.errorCode()).isEqualTo(ErrorCode.ANALYSIS_BUSY));
	}

	private InMemoryContractAnalysisJobStore store() {
		return new InMemoryContractAnalysisJobStore(
			Clock.fixed(Instant.parse("2026-08-20T00:00:00Z"), ZoneOffset.UTC)
		);
	}

	private MockMultipartFile file(String name) {
		return new MockMultipartFile("files", name, "application/pdf", "pdf".getBytes());
	}

	private ContractAnalysisResponse response() {
		ContractFacts facts = new ContractFacts(
			IndustryCategory.MANUFACTURING, 40, 8, 60, 1, 2_300_000, 11_005,
			true, true, true, 12, true, false, 0
		);
		return new ContractAnalysisResponse(
			"request-001",
			new ContractDiagnosis(facts, List.of(), List.of()),
			"문제가 없습니다.",
			new AnalysisOutcome.Analysis("정상", List.of(), List.of()),
			new SessionMessage("user-1", MessageRole.USER, "질문", Instant.EPOCH),
			new SessionMessage("ai-1", MessageRole.AI, "문제가 없습니다.", Instant.EPOCH)
		);
	}
}
