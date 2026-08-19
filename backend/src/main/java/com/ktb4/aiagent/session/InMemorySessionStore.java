package com.ktb4.aiagent.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

@Component
public class InMemorySessionStore {

	private final ConcurrentMap<String, TemporarySession> sessions = new ConcurrentHashMap<>();
	private final Clock clock;

	public InMemorySessionStore() {
		this(Clock.systemUTC());
	}

	InMemorySessionStore(Clock clock) {
		this.clock = Objects.requireNonNull(clock, "Clock must not be null");
	}

	public TemporarySession create(String sessionId, Duration ttl) {
		if (ttl == null || ttl.isZero() || ttl.isNegative()) {
			throw new IllegalArgumentException("Session TTL must be positive");
		}

		removeExpired();
		TemporarySession session = new TemporarySession(sessionId, clock.instant().plus(ttl));
		TemporarySession previous = sessions.putIfAbsent(sessionId, session);
		if (previous != null) {
			throw new IllegalStateException("Session ID already exists");
		}
		return session;
	}

	public Optional<TemporarySession> findActive(String sessionId) {
		TemporarySession session = sessions.get(sessionId);
		if (session == null) {
			return Optional.empty();
		}
		if (isExpired(session, clock.instant())) {
			sessions.remove(sessionId, session);
			return Optional.empty();
		}
		return Optional.of(session);
	}

	public int removeExpired() {
		Instant now = clock.instant();
		AtomicInteger removedCount = new AtomicInteger();
		sessions.forEach((sessionId, session) -> {
			if (isExpired(session, now) && sessions.remove(sessionId, session)) {
				removedCount.incrementAndGet();
			}
		});
		return removedCount.get();
	}

	int storedSessionCount() {
		return sessions.size();
	}

	private boolean isExpired(TemporarySession session, Instant now) {
		return !session.expiresAt().isAfter(now);
	}
}
