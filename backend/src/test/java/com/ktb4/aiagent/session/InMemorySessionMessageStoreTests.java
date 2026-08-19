package com.ktb4.aiagent.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class InMemorySessionMessageStoreTests {

	private InMemorySessionMessageStore store;

	@BeforeEach
	void setUp() {
		store = new InMemorySessionMessageStore();
	}

	@Test
	void returnsSnapshotWithoutExposingInternalCollection() {
		SessionMessage first = message("message-001", "첫 번째 메시지");
		SessionMessage second = message("message-002", "두 번째 메시지");
		store.add("session-001", first);

		List<SessionMessage> snapshot = store.findAll("session-001");

		assertThrows(UnsupportedOperationException.class, () -> snapshot.add(second));
		store.add("session-001", second);
		assertEquals(List.of(first), snapshot);
		assertEquals(List.of(first, second), store.findAll("session-001"));
	}

	@Test
	void keepsAllMessagesAddedConcurrently() throws Exception {
		ExecutorService executor = Executors.newFixedThreadPool(8);
		try {
			List<? extends Future<?>> additions = java.util.stream.IntStream.range(0, 100)
				.mapToObj(index -> executor.submit(() -> store.add(
					"session-001",
					message("message-" + index, "메시지 " + index)
				)))
				.toList();
			for (Future<?> addition : additions) {
				addition.get();
			}

			assertEquals(100, store.findAll("session-001").size());
		}
		finally {
			executor.shutdownNow();
		}
	}

	private SessionMessage message(String messageId, String content) {
		return new SessionMessage(
			messageId,
			MessageRole.USER,
			content,
			Instant.parse("2026-08-19T00:00:00Z")
		);
	}
}
