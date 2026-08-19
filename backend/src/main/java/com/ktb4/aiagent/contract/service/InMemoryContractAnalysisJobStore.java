package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.contract.dto.ContractAnalysisJobResponse;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;

@Component
public class InMemoryContractAnalysisJobStore {

	private final ConcurrentMap<String, Entry> jobs = new ConcurrentHashMap<>();
	private final Clock clock;

	public InMemoryContractAnalysisJobStore() {
		this(Clock.systemUTC());
	}

	InMemoryContractAnalysisJobStore(Clock clock) {
		this.clock = Objects.requireNonNull(clock, "Clock must not be null");
	}

	public ContractAnalysisJobResponse create(
			String analysisId,
			String sessionId,
			int totalFiles,
			Duration ttl) {
		removeExpired();
		ContractAnalysisJobResponse response = new ContractAnalysisJobResponse(
			analysisId,
			ContractAnalysisJobResponse.Status.PROCESSING,
			ContractAnalysisJobResponse.Stage.OCR,
			0,
			totalFiles,
			null,
			null
		);
		Entry entry = new Entry(sessionId, response, clock.instant().plus(ttl));
		if (jobs.putIfAbsent(analysisId, entry) != null) {
			throw new IllegalStateException("Analysis ID already exists");
		}
		return response;
	}

	public Optional<ContractAnalysisJobResponse> find(String sessionId, String analysisId) {
		Entry entry = jobs.get(analysisId);
		if (entry == null || !entry.sessionId().equals(sessionId)) {
			return Optional.empty();
		}
		if (!entry.expiresAt().isAfter(clock.instant())) {
			jobs.remove(analysisId, entry);
			return Optional.empty();
		}
		return Optional.of(entry.response());
	}

	public void updateOcr(String analysisId, int processedFiles) {
		update(analysisId, current -> copy(
			current,
			ContractAnalysisJobResponse.Status.PROCESSING,
			ContractAnalysisJobResponse.Stage.OCR,
			processedFiles,
			null,
			null
		));
	}

	public void updateStage(String analysisId, ContractAnalysisJobResponse.Stage stage) {
		update(analysisId, current -> copy(
			current,
			ContractAnalysisJobResponse.Status.PROCESSING,
			stage,
			current.processedFiles(),
			null,
			null
		));
	}

	public void complete(String analysisId, ContractAnalysisResponse result) {
		update(analysisId, current -> copy(
			current,
			ContractAnalysisJobResponse.Status.COMPLETED,
			ContractAnalysisJobResponse.Stage.COMPLETED,
			current.totalFiles(),
			result,
			null
		));
	}

	public void fail(String analysisId, ErrorCode errorCode) {
		update(analysisId, current -> copy(
			current,
			ContractAnalysisJobResponse.Status.FAILED,
			current.stage(),
			current.processedFiles(),
			null,
			new ContractAnalysisJobResponse.JobError(errorCode.code(), errorCode.message())
		));
	}

	public void remove(String analysisId) {
		jobs.remove(analysisId);
	}

	private void update(String analysisId, java.util.function.UnaryOperator<ContractAnalysisJobResponse> updater) {
		jobs.computeIfPresent(analysisId, (ignored, entry) -> new Entry(
			entry.sessionId(),
			updater.apply(entry.response()),
			entry.expiresAt()
		));
	}

	private ContractAnalysisJobResponse copy(
			ContractAnalysisJobResponse current,
			ContractAnalysisJobResponse.Status status,
			ContractAnalysisJobResponse.Stage stage,
			int processedFiles,
			ContractAnalysisResponse result,
			ContractAnalysisJobResponse.JobError error) {
		return new ContractAnalysisJobResponse(
			current.analysisId(),
			status,
			stage,
			processedFiles,
			current.totalFiles(),
			result,
			error
		);
	}

	private void removeExpired() {
		Instant now = clock.instant();
		jobs.forEach((analysisId, entry) -> {
			if (!entry.expiresAt().isAfter(now)) {
				jobs.remove(analysisId, entry);
			}
		});
	}

	private record Entry(
		String sessionId,
		ContractAnalysisJobResponse response,
		Instant expiresAt
	) {
	}
}
