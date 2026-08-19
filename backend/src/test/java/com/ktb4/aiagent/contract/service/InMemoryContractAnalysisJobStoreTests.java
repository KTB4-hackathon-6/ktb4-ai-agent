package com.ktb4.aiagent.contract.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class InMemoryContractAnalysisJobStoreTests {

	@Test
	void hidesJobsFromOtherSessionsAndRemovesExpiredJobs() {
		MutableClock clock = new MutableClock(Instant.parse("2026-08-20T00:00:00Z"));
		InMemoryContractAnalysisJobStore store = new InMemoryContractAnalysisJobStore(clock);
		store.create("analysis-001", "session-001", 2, Duration.ofMinutes(30));

		assertThat(store.find("session-other", "analysis-001")).isEmpty();
		assertThat(store.find("session-001", "analysis-001")).isPresent();

		clock.advance(Duration.ofMinutes(31));

		assertThat(store.find("session-001", "analysis-001")).isEmpty();
	}

	private static final class MutableClock extends Clock {

		private Instant instant;

		private MutableClock(Instant instant) {
			this.instant = instant;
		}

		void advance(Duration duration) {
			instant = instant.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return instant;
		}
	}
}
