package com.ktb4.aiagent.document;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

class HwpxFormGeneratorTests {

	private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
	private HwpxFormGenerator generator;

	@BeforeEach
	void setUp() {
		generator = new HwpxFormGenerator(
			objectMapper,
			Clock.fixed(Instant.parse("2026-08-19T00:00:00Z"), ZoneOffset.UTC),
			() -> "document-001"
		);
	}

	@Test
	void generatesValidHwpxWithoutChangingTemplate() throws Exception {
		byte[] templateBefore = resourceBytes(
			"/forms/labor-complaint-001/labor-complaint-001-template.hwpx"
		);
		AnalysisOutcome.DocumentDraft draft = readyDraft(readFixture());

		DocumentGenerationResult result = generator.generate(draft);

		assertThat(result.status()).isEqualTo(DocumentGenerationResult.Status.GENERATED);
		assertThat(result.missingFields()).isEmpty();
		GeneratedDocument document = result.document();
		assertThat(document).isNotNull();
		assertThat(document.documentId()).isEqualTo("document-001");
		assertThat(document.templateId()).isEqualTo("LABOR_COMPLAINT_001");
		assertThat(document.templateVersion()).isEqualTo("1.0");
		assertThat(document.mimeType()).isEqualTo("application/hwp+zip");
		assertThat(document.fileName()).endsWith(".hwpx");
		assertThat(document.generatedAt()).isEqualTo(Instant.parse("2026-08-19T00:00:00Z"));
		assertThat(document.bytes()).isNotEmpty();

		Map<String, byte[]> entries = unzip(document.bytes());
		assertThat(entries.keySet()).contains(
			"mimetype",
			"META-INF/container.xml",
			"Contents/content.hpf",
			"Contents/header.xml",
			"Contents/section0.xml"
		);
		assertThat(new String(entries.get("mimetype"), StandardCharsets.UTF_8))
			.isEqualTo("application/hwp+zip");
		for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
			if (entry.getKey().endsWith(".xml") || entry.getKey().endsWith(".hpf")) {
				parseXml(entry.getValue());
			}
		}

		Document section = parseXml(entries.get("Contents/section0.xml"));
		assertThat(tableCellText(section, 0, 0, 1)).isEqualTo("NGUYEN VAN TEST");
		assertThat(tableCellText(section, 0, 0, 3)).isEqualTo("TEST-980412-0000000");
		assertThat(tableCellText(section, 0, 1, 1)).isEqualTo("경기도 안산시 단원구 테스트로 10");
		assertThat(tableCellText(section, 0, 2, 1)).isEmpty();
		assertThat(tableCellText(section, 0, 2, 3)).isEqualTo("010-0000-0001");
		assertThat(tableCellText(section, 0, 3, 1)).isEqualTo("worker.test@example.com");
		assertThat(tableCellText(section, 0, 4, 1)).isEqualTo("☑ 예     □ 아니오");
		assertThat(tableCellText(section, 0, 4, 3)).isEqualTo("□ 예     ☑ 아니오");
		assertThat(tableCellText(section, 1, 0, 1)).isEqualTo("김테스트");
		assertThat(tableCellText(section, 1, 0, 3)).isEqualTo("010-0000-0002");
		assertThat(tableCellText(section, 1, 2, 1)).isEqualTo("☑ 사업장     □ 공사현장");
		assertThat(tableCellText(section, 1, 3, 1)).isEqualTo("테스트산업 주식회사");
		assertThat(tableCellText(section, 1, 4, 1)).isEqualTo("경기도 안산시 단원구 공단테스트로 30");
		assertThat(tableCellText(section, 1, 5, 1)).isEqualTo("031-000-0000");
		assertThat(tableCellText(section, 1, 5, 3)).isEqualTo("12");
		assertThat(tableCellText(section, 2, 0, 1)).isEqualTo("2026-02-20");
		assertThat(tableCellText(section, 2, 0, 3)).isEmpty();
		assertThat(tableCellText(section, 2, 1, 1)).isEqualTo("406,923원");
		assertThat(tableCellText(section, 2, 1, 3)).isEqualTo("□ 퇴직     ☑ 재직");
		assertThat(tableCellText(section, 2, 2, 1)).isEqualTo("0원");
		assertThat(tableCellText(section, 2, 2, 3)).isEqualTo("0원");
		assertThat(tableCellText(section, 2, 3, 1)).isEqualTo("사출성형 부품 생산 및 검수");
		assertThat(tableCellText(section, 2, 4, 1)).isEmpty();
		assertThat(tableCellText(section, 2, 4, 3)).isEqualTo("☑ 서면     □ 구두");
		assertThat(tableCellText(section, 2, 5, 1)).contains("최저임금 10,320원");
		assertThat(tableCellText(section, 2, 6, 1))
			.isEqualTo("표준근로계약서.pdf, 규칙진단결과.json");
		assertThat(allText(section)).contains("(안산)고용노동(지)청장 귀하");
		assertThat(allText(section)).doesNotContain("{{");

		Path output = Path.of("build", "test-results", "hwpx", "labor-complaint-ready.hwpx");
		Files.createDirectories(output.getParent());
		Files.write(output, document.bytes());
		assertThat(Files.size(output)).isPositive();
		assertThat(sha256(resourceBytes(
			"/forms/labor-complaint-001/labor-complaint-001-template.hwpx"
		))).isEqualTo(sha256(templateBefore));
	}

	@Test
	void preservesXmlSpecialCharactersAsText() throws Exception {
		JsonNode fixture = readFixture();
		((ObjectNode) firstDraft(fixture).path("data").path("complainant"))
			.put("fullName", "김<&>\"테스트\"");

		DocumentGenerationResult result = generator.generate(readyDraft(fixture));

		Document section = parseXml(unzip(result.document().bytes()).get("Contents/section0.xml"));
		assertThat(tableCellText(section, 0, 0, 1)).isEqualTo("김<&>\"테스트\"");
	}

	@Test
	void doesNotGenerateDocumentWhenRequiredFieldsNeedInput() throws Exception {
		JsonNode fixture = readFixture();
		ObjectNode draft = firstDraft(fixture);
		draft.put("status", "NEEDS_INPUT");
		((ObjectNode) draft.path("data").path("complainant")).putNull("mobilePhone");
		ArrayNode missingFields = (ArrayNode) draft.path("missingFields");
		missingFields.addObject()
			.put("fieldId", "complainant.mobilePhone")
			.put("displayName", "휴대전화번호")
			.put("required", true)
			.put("inputType", "PHONE")
			.put("question", "연락 가능한 휴대전화번호를 입력해 주세요.")
			.put("reason", "진정 처리 연락을 받기 위해 필요합니다.")
			.put("sensitive", true)
			.set("validationRules", objectMapper.createObjectNode()
				.put("pattern", "^01[0-9]-[0-9]{3,4}-[0-9]{4}$")
				.put("minLength", 12)
				.put("maxLength", 13)
				.putNull("minValue")
				.putNull("maxValue")
				.set("allowedValues", objectMapper.createArrayNode()));
		((ObjectNode) missingFields.get(0)).put("status", "MISSING");

		DocumentGenerationResult result = generator.generate(readyDraft(fixture));

		assertThat(result.status()).isEqualTo(DocumentGenerationResult.Status.NEEDS_INPUT);
		assertThat(result.document()).isNull();
		assertThat(result.missingFields())
			.extracting(AnalysisOutcome.MissingField::fieldId)
			.containsExactly("complainant.mobilePhone");
		assertThat(result.missingFields().getFirst().question())
			.isEqualTo("연락 가능한 휴대전화번호를 입력해 주세요.");
	}

	private AnalysisOutcome.DocumentDraft readyDraft(JsonNode fixture) throws IOException {
		com.ktb4.aiagent.analysis.DocumentPreparationOutcome outcome = objectMapper.treeToValue(
			fixture.path("result"),
			com.ktb4.aiagent.analysis.DocumentPreparationOutcome.class
		);
		return outcome.documentDrafts().getFirst();
	}

	private JsonNode readFixture() throws IOException {
		try (InputStream input = getClass().getResourceAsStream(
			"/analysis/labor-complaint-ready.json"
		)) {
			if (input == null) {
				throw new IllegalStateException("Shared analysis fixture is missing");
			}
			return objectMapper.readTree(input);
		}
	}

	private ObjectNode firstDraft(JsonNode response) {
		return (ObjectNode) response.path("result")
			.path("documentDrafts")
			.get(0);
	}

	private byte[] resourceBytes(String path) throws IOException {
		try (InputStream input = getClass().getResourceAsStream(path)) {
			if (input == null) {
				throw new IllegalStateException("Resource is missing: " + path);
			}
			return input.readAllBytes();
		}
	}

	private Map<String, byte[]> unzip(byte[] bytes) throws IOException {
		Map<String, byte[]> entries = new HashMap<>();
		try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(bytes))) {
			ZipEntry entry;
			while ((entry = input.getNextEntry()) != null) {
				entries.put(entry.getName(), input.readAllBytes());
			}
		}
		return entries;
	}

	private Document parseXml(byte[] bytes) throws Exception {
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setNamespaceAware(true);
		return factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
	}

	private String tableCellText(Document document, int tableIndex, int row, int column) {
		Element table = elements(document, "tbl").item(tableIndex);
		for (Element cell : elements(table, "tc")) {
			Element address = elements(cell, "cellAddr").item(0);
			if (Integer.parseInt(address.getAttribute("rowAddr")) == row
				&& Integer.parseInt(address.getAttribute("colAddr")) == column) {
				return allText(cell).strip();
			}
		}
		throw new AssertionError("Cell not found");
	}

	private String allText(Node node) {
		StringBuilder text = new StringBuilder();
		for (Element element : elements(node, "t")) {
			text.append(element.getTextContent());
		}
		return text.toString();
	}

	private Elements elements(Node node, String localName) {
		NodeList nodes = node instanceof Document document
			? document.getElementsByTagNameNS("*", localName)
			: ((Element) node).getElementsByTagNameNS("*", localName);
		return new Elements(nodes);
	}

	private String sha256(byte[] bytes) throws Exception {
		return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
	}

	private record Elements(NodeList nodes) implements Iterable<Element> {

		Element item(int index) {
			return (Element) nodes.item(index);
		}

		@Override
		public java.util.Iterator<Element> iterator() {
			return new java.util.Iterator<>() {
				private int index;

				@Override
				public boolean hasNext() {
					return index < nodes.getLength();
				}

				@Override
				public Element next() {
					return (Element) nodes.item(index++);
				}
			};
		}
	}
}
