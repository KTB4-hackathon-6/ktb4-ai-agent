package com.ktb4.aiagent.analysis;

@FunctionalInterface
public interface AnalysisClient {

	String analyze(String requestId, String sessionId, String content);
}
