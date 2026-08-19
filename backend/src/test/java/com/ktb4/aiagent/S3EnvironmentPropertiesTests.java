package com.ktb4.aiagent;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

@SpringBootTest(properties = {
	"AWS_REGION=test-region",
	"S3_BUCKET_NAME=test-bucket",
	"S3_ORIGINALS_PREFIX=test-originals/",
	"S3_RESULTS_PREFIX=test-results/",
	"S3_MODELS_PREFIX=test-models/",
	"S3_PRESIGNED_EXPIRES_SECONDS=123"
})
class S3EnvironmentPropertiesTests {

	@Autowired
	private Environment environment;

	@Test
	void mapsS3EnvironmentVariablesToNamespacedProperties() {
		assertEquals("test-region", environment.getProperty("aws.region"));
		assertEquals("test-bucket", environment.getProperty("aws.s3.bucket-name"));
		assertEquals("test-originals/", environment.getProperty("aws.s3.originals-prefix"));
		assertEquals("test-results/", environment.getProperty("aws.s3.results-prefix"));
		assertEquals("test-models/", environment.getProperty("aws.s3.models-prefix"));
		assertEquals("123", environment.getProperty("aws.s3.presigned-expires-seconds"));
	}
}
