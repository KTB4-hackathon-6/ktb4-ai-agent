package com.ktb4.aiagent.contract.service;

import com.ktb4.aiagent.analysis.PreferredLanguage;
import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.contract.dto.ContractAnalysisJobResponse;
import com.ktb4.aiagent.contract.dto.ContractAnalysisResponse;
import com.ktb4.aiagent.ocr.service.OcrRequestValidator;
import com.ktb4.aiagent.session.SessionMessageService;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ContractAnalysisJobService {

	private static final Logger log = LoggerFactory.getLogger(ContractAnalysisJobService.class);

	private final ContractAnalysisService analysisService;
	private final SessionMessageService messageService;
	private final OcrRequestValidator fileValidator;
	private final InMemoryContractAnalysisJobStore store;
	private final TaskExecutor executor;
	private final Duration jobTtl;
	private final Supplier<String> analysisIdSupplier;

	@Autowired
	public ContractAnalysisJobService(
			ContractAnalysisService analysisService,
			SessionMessageService messageService,
			OcrRequestValidator fileValidator,
			InMemoryContractAnalysisJobStore store,
			@Qualifier("contractAnalysisExecutor") TaskExecutor executor,
			@Value("${app.contract-analysis.job-ttl}") Duration jobTtl) {
		this(
			analysisService,
			messageService,
			fileValidator,
			store,
			executor,
			jobTtl,
			() -> UUID.randomUUID().toString()
		);
	}

	ContractAnalysisJobService(
			ContractAnalysisService analysisService,
			SessionMessageService messageService,
			OcrRequestValidator fileValidator,
			InMemoryContractAnalysisJobStore store,
			TaskExecutor executor,
			Duration jobTtl,
			Supplier<String> analysisIdSupplier) {
		this.analysisService = Objects.requireNonNull(analysisService, "Analysis service must not be null");
		this.messageService = Objects.requireNonNull(messageService, "Message service must not be null");
		this.fileValidator = Objects.requireNonNull(fileValidator, "File validator must not be null");
		this.store = Objects.requireNonNull(store, "Job store must not be null");
		this.executor = Objects.requireNonNull(executor, "Task executor must not be null");
		if (jobTtl == null || jobTtl.isZero() || jobTtl.isNegative()) {
			throw new IllegalArgumentException("Job TTL must be positive");
		}
		this.jobTtl = jobTtl;
		this.analysisIdSupplier = Objects.requireNonNull(analysisIdSupplier, "Analysis ID supplier must not be null");
	}

	public ContractAnalysisJobResponse start(
			String sessionId,
			String text,
			PreferredLanguage preferredLanguage,
			List<MultipartFile> files) {
		messageService.validateUserMessage(sessionId, text);
		List<MultipartFile> bufferedFiles = bufferFiles(files);
		String analysisId = analysisIdSupplier.get();
		ContractAnalysisJobResponse created = store.create(
			analysisId,
			sessionId,
			bufferedFiles.size(),
			jobTtl
		);
		try {
			executor.execute(() -> runAnalysis(
				analysisId,
				sessionId,
				text,
				preferredLanguage,
				bufferedFiles
			));
		}
		catch (TaskRejectedException exception) {
			store.remove(analysisId);
			throw new ApplicationException(ErrorCode.ANALYSIS_BUSY);
		}
		return created;
	}

	public ContractAnalysisJobResponse get(String sessionId, String analysisId) {
		messageService.validateSession(sessionId);
		return store.find(sessionId, analysisId)
			.orElseThrow(() -> new ApplicationException(ErrorCode.ANALYSIS_NOT_FOUND));
	}

	private List<MultipartFile> bufferFiles(List<MultipartFile> files) {
		if (files == null || files.isEmpty()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		List<MultipartFile> buffered = new ArrayList<>();
		for (MultipartFile file : files) {
			fileValidator.validateFile(file);
			try {
				buffered.add(new BufferedMultipartFile(file));
			}
			catch (IOException exception) {
				throw new ApplicationException(ErrorCode.INVALID_REQUEST);
			}
		}
		return List.copyOf(buffered);
	}

	private void runAnalysis(
			String analysisId,
			String sessionId,
			String text,
			PreferredLanguage preferredLanguage,
			List<MultipartFile> files) {
		ContractAnalysisProgressListener listener = new ContractAnalysisProgressListener() {
			@Override
			public void onOcrProgress(int processedFiles, int totalFiles) {
				store.updateOcr(analysisId, processedFiles);
			}

			@Override
			public void onStructuring() {
				store.updateStage(analysisId, ContractAnalysisJobResponse.Stage.STRUCTURING);
			}

			@Override
			public void onGeneratingResponse() {
				store.updateStage(analysisId, ContractAnalysisJobResponse.Stage.GENERATING_RESPONSE);
			}
		};
		try {
			ContractAnalysisResponse result = analysisService.analyze(
				sessionId,
				text,
				preferredLanguage,
				files,
				listener
			);
			store.complete(analysisId, result);
		}
		catch (ApplicationException exception) {
			store.fail(analysisId, exception.errorCode());
		}
		catch (Exception exception) {
			log.error("Contract analysis job failed unexpectedly for analysisId={}", analysisId, exception);
			store.fail(analysisId, ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}
}
