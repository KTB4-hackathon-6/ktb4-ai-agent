package com.ktb4.aiagent.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

final class MutableClock extends Clock {

	private Instant currentInstant;

	MutableClock(Instant currentInstant) {
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
