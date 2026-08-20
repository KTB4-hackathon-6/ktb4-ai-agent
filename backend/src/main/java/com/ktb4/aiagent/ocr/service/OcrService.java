package com.ktb4.aiagent.ocr.service;

import com.ktb4.aiagent.common.exception.ApplicationException;
import com.ktb4.aiagent.common.exception.ErrorCode;
import com.ktb4.aiagent.ocr.client.ClovaOcrClient;
import com.ktb4.aiagent.ocr.client.ClovaTextJoiner;
import com.ktb4.aiagent.ocr.dto.OcrAnalysisResponse;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrImageResult;
import com.ktb4.aiagent.ocr.dto.clova.ClovaOcrResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletionService;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.IntConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class OcrService {

	private static final Logger log = LoggerFactory.getLogger(OcrService.class);

	private final OcrRequestValidator validator;
	private final ClovaOcrClient clovaOcrClient;

	public OcrService(OcrRequestValidator validator, ClovaOcrClient clovaOcrClient) {
		this.validator = validator;
		this.clovaOcrClient = clovaOcrClient;
	}

	public OcrAnalysisResponse analyze(MultipartFile image) {
		validator.validateFile(image);
		String format = resolveClovaFormat(image.getContentType());

		byte[] bytes;
		try {
			bytes = image.getBytes();
		} catch (IOException e) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}

		ClovaOcrResponse response = clovaOcrClient.recognize(bytes, format, "document", "ko");
		ClovaOcrImageResult result = firstResult(response);
		String fullText = ClovaTextJoiner.join(result.fields());

		return new OcrAnalysisResponse(Instant.now(), fullText);
	}

	public List<OcrAnalysisResponse> analyzeAll(List<? extends MultipartFile> images) {
		return analyzeAll(images, processedFiles -> {
		});
	}

	public List<OcrAnalysisResponse> analyzeAll(
			List<? extends MultipartFile> images,
			IntConsumer progressListener) {
		if (images == null || images.isEmpty()) {
			throw new ApplicationException(ErrorCode.INVALID_REQUEST);
		}
		images.forEach(validator::validateFile);

		List<OcrAnalysisResponse> responses = new ArrayList<>(Collections.nCopies(images.size(), null));
		List<Future<IndexedResponse>> futures = new ArrayList<>(images.size());
		try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
			CompletionService<IndexedResponse> completions = new ExecutorCompletionService<>(executor);
			for (int index = 0; index < images.size(); index++) {
				int responseIndex = index;
				MultipartFile image = images.get(index);
				futures.add(completions.submit(() -> new IndexedResponse(responseIndex, analyze(image))));
			}
			for (int processed = 1; processed <= images.size(); processed++) {
				IndexedResponse completed = completions.take().get();
				responses.set(completed.index(), completed.response());
				progressListener.accept(processed);
			}
		}
		catch (InterruptedException exception) {
			futures.forEach(future -> future.cancel(true));
			Thread.currentThread().interrupt();
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_TIMEOUT);
		}
		catch (ExecutionException exception) {
			futures.forEach(future -> future.cancel(true));
			if (exception.getCause() instanceof RuntimeException runtimeException) {
				throw runtimeException;
			}
			if (exception.getCause() instanceof Error error) {
				throw error;
			}
			throw new ApplicationException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
		return List.copyOf(responses);
	}

	private ClovaOcrImageResult firstResult(ClovaOcrResponse response) {
		if (response == null || response.images() == null || response.images().isEmpty()) {
			log.warn("Naver Clova OCR response had no images");
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_REQUEST_ERROR);
		}
		ClovaOcrImageResult result = response.images().get(0);
		if (result.fields() == null) {
			log.warn("Naver Clova OCR response had no recognized fields");
			throw new ApplicationException(ErrorCode.OCR_PROVIDER_REQUEST_ERROR);
		}
		return result;
	}

	private String resolveClovaFormat(String contentType) {
		if (contentType == null) {
			throw new ApplicationException(ErrorCode.UNSUPPORTED_FILE_TYPE);
		}
		return switch (contentType) {
			case "image/jpeg" -> "jpg";
			case "image/png" -> "png";
			case "application/pdf" -> "pdf";
			default -> throw new ApplicationException(ErrorCode.UNSUPPORTED_FILE_TYPE);
		};
	}

	private record IndexedResponse(int index, OcrAnalysisResponse response) {
	}
}
