package com.ktb4.aiagent.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class InMemorySessionStoreTests {

	private MutableClock clock;
	private InMemorySessionStore store;

	@BeforeEach
	void setUp() {
		clock = new MutableClock(Instant.parse("2026-08-19T00:00:00Z"));
		store = new InMemorySessionStore(clock);
	}

	@Test
	void keepsSessionActiveOnlyBeforeExpiration() {
		TemporarySession session = store.create("session-001", Duration.ofMinutes(30));

		assertEquals(Instant.parse("2026-08-19T00:30:00Z"), session.expiresAt());
		assertTrue(store.findActive("session-001").isPresent());

		clock.advance(Duration.ofMinutes(30));

		assertFalse(store.findActive("session-001").isPresent());
		assertEquals(0, store.storedSessionCount());
	}

	@Test
	void removesExpiredSessionsWhenCreatingAnotherSession() {
		store.create("session-expired", Duration.ofMinutes(1));
		clock.advance(Duration.ofMinutes(2));

		store.create("session-active", Duration.ofMinutes(30));

		assertEquals(1, store.storedSessionCount());
		assertTrue(store.findActive("session-active").isPresent());
	}

	@Test
	void rejectsNonPositiveTtl() {
		assertThrows(IllegalArgumentException.class,
			() -> store.create("session-001", Duration.ZERO));
	}

	private static final class MutableClock extends Clock {

		private Instant currentInstant;

		private MutableClock(Instant currentInstant) {
			this.currentInstant = currentInstant;
		}

		void advance(Duration duration) {
			currentInstant = currentInstant.plus(duration);
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
			return currentInstant;
		}
	}
}
