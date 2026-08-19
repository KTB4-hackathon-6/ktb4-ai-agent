package com.ktb4.aiagent.session;

import java.time.Duration;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

	private final InMemorySessionStore store;
	private final Duration ttl;
	private final Supplier<String> sessionIdSupplier;

	@Autowired
	public SessionService(InMemorySessionStore store, @Value("${app.session.ttl}") Duration ttl) {
		this(store, ttl, () -> UUID.randomUUID().toString());
	}

	SessionService(InMemorySessionStore store, Duration ttl, Supplier<String> sessionIdSupplier) {
		this.store = Objects.requireNonNull(store, "Session store must not be null");
		if (ttl == null || ttl.isZero() || ttl.isNegative()) {
			throw new IllegalArgumentException("Session TTL must be positive");
		}
		this.ttl = ttl;
		this.sessionIdSupplier = Objects.requireNonNull(sessionIdSupplier, "Session ID supplier must not be null");
	}

	public TemporarySession createSession() {
		return store.create(sessionIdSupplier.get(), ttl);
	}
}
