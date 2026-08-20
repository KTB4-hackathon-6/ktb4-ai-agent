package com.ktb4.aiagent.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PreferredLanguageTests {

	@Test
	void parsesKoreanLanguageCode() {
		assertThat(PreferredLanguage.fromCode("ko")).isEqualTo(PreferredLanguage.KO);
	}
}
