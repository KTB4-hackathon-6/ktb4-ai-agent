package com.ktb4.aiagent.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ktb4.aiagent.analysis.AnalysisOutcome;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

@Service
public class HwpxFormGenerator {

	private static final String LABOR_COMPLAINT_TEMPLATE_ID = "LABOR_COMPLAINT_001";
	private static final String LABOR_COMPLAINT_TEMPLATE_VERSION = "1.0";
	private static final String TEMPLATE_RESOURCE =
		"/forms/labor-complaint-001/labor-complaint-001-template.hwpx";
	private static final String MAPPING_RESOURCE =
		"/forms/labor-complaint-001/labor-complaint-001-field-mapping.json";
	private static final String HWPX_MIME_TYPE = "application/hwp+zip";
	private static final String PARAGRAPH_NAMESPACE =
		"http://www.hancom.co.kr/hwpml/2011/paragraph";
	private static final int MAX_TEMPLATE_ENTRY_COUNT = 1_000;
	private static final int MAX_TEMPLATE_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
	private static final Set<String> REQUIRED_ENTRIES = Set.of(
		"mimetype",
		"META-INF/container.xml",
		"Contents/content.hpf",
		"Contents/header.xml",
		"Contents/section0.xml"
	);

	private final Clock clock;
	private final Supplier<String> documentIdSupplier;
	private final byte[] templateBytes;
	private final TemplateMapping mapping;

	public HwpxFormGenerator() {
		this(new ObjectMapper(), Clock.systemUTC(), () -> UUID.randomUUID().toString());
	}

	HwpxFormGenerator(
		ObjectMapper objectMapper,
		Clock clock,
		Supplier<String> documentIdSupplier
	) {
		Objects.requireNonNull(objectMapper, "Object mapper must not be null");
		this.clock = Objects.requireNonNull(clock, "Clock must not be null");
		this.documentIdSupplier = Objects.requireNonNull(
			documentIdSupplier,
			"Document ID supplier must not be null"
		);
		this.templateBytes = readResource(TEMPLATE_RESOURCE);
		this.mapping = readMapping(objectMapper);
		validateMapping();
		validatePackage(readTemplateEntries());
	}

	public DocumentGenerationResult generate(AnalysisOutcome.DocumentDraft draft) {
		Objects.requireNonNull(draft, "Document draft must not be null");
		if (draft.status() == AnalysisOutcome.DocumentDraftStatus.NEEDS_INPUT) {
			return DocumentGenerationResult.needsInput(draft.missingFields());
		}
		if (draft.status() != AnalysisOutcome.DocumentDraftStatus.READY) {
			throw new IllegalArgumentException("Only READY drafts can be generated");
		}
		validateDraftContract(draft);

		return DocumentGenerationResult.generated(generateDocument(draft.data()));
	}

	/**
	 * Generates a downloadable snapshot from the values collected so far. Missing
	 * optional or required values are rendered as blank fields in the template.
	 */
	public GeneratedDocument generatePartial(AnalysisOutcome.LaborComplaintFormData data) {
		return generateDocument(Objects.requireNonNull(data, "Form data must not be null"));
	}

	private GeneratedDocument generateDocument(AnalysisOutcome.LaborComplaintFormData data) {
		Map<String, TemplateEntry> entries = readTemplateEntries();
		Map<String, Document> documents = new LinkedHashMap<>();
		for (FieldMapping field : mapping.fields()) {
			Document document = documents.computeIfAbsent(
				field.target().entry(),
				entryName -> parseXml(requireEntry(entries, entryName).content())
			);
			String value = fieldValue(data, field);
			applyValue(document, field.target(), value);
		}
		for (Map.Entry<String, Document> document : documents.entrySet()) {
			TemplateEntry previous = requireEntry(entries, document.getKey());
			entries.put(
				document.getKey(),
				new TemplateEntry(previous.source(), serialize(document.getValue()))
			);
		}
		validatePackage(entries);
		byte[] generatedBytes = writePackage(entries);
		String documentId = requireGeneratedId(documentIdSupplier.get());
		return new GeneratedDocument(
			documentId,
			mapping.templateId(),
			mapping.templateVersion(),
			"진정서-" + documentId + ".hwpx",
			HWPX_MIME_TYPE,
			clock.instant(),
			generatedBytes,
			GeneratedDocument.Status.GENERATED
		);
	}

	private void validateDraftContract(AnalysisOutcome.DocumentDraft draft) {
		List<String> missing = draft.data().requiredMissingFieldIds();
		if (!missing.isEmpty()) {
			throw new IllegalArgumentException(
				"READY draft has missing required fields: " + String.join(", ", missing)
			);
		}
	}

	private String fieldValue(
		AnalysisOutcome.LaborComplaintFormData data,
		FieldMapping field
	) {
		Object rawValue = switch (field.fieldId()) {
			case "complainant.fullName" -> data.complainant().fullName();
			case "complainant.residentRegistrationNumber" ->
				data.complainant().residentRegistrationNumber();
			case "complainant.address" -> data.complainant().address();
			case "complainant.telephone" -> data.complainant().telephone();
			case "complainant.mobilePhone" -> data.complainant().mobilePhone();
			case "complainant.email" -> data.complainant().email();
			case "complainant.receiveStatusUpdates" -> yesNo(data.complainant().receiveStatusUpdates());
			case "complainant.notifyViaLaborPortal" -> yesNo(data.complainant().notifyViaLaborPortal());
			case "respondent.fullName" -> data.respondent().fullName();
			case "respondent.contact" -> data.respondent().contact();
			case "respondent.address" -> data.respondent().address();
			case "respondent.workplaceType" -> workplaceType(data.respondent().workplaceType());
			case "respondent.workplaceName" -> data.respondent().workplaceName();
			case "respondent.actualWorkplaceAddress" -> data.respondent().actualWorkplaceAddress();
			case "respondent.workplaceTelephone" -> data.respondent().workplaceTelephone();
			case "respondent.employeeCount" -> data.respondent().employeeCount();
			case "complaint.employmentStartDate" -> data.complaint().employmentStartDate();
			case "complaint.employmentEndDate" -> data.complaint().employmentEndDate();
			case "complaint.unpaidWagesTotal" -> money(data.complaint().unpaidWagesTotal());
			case "complaint.employmentStatus" -> employmentStatus(data.complaint().employmentStatus());
			case "complaint.unpaidSeverancePay" -> money(data.complaint().unpaidSeverancePay());
			case "complaint.otherUnpaidAmount" -> money(data.complaint().otherUnpaidAmount());
			case "complaint.jobDescription" -> data.complaint().jobDescription();
			case "complaint.payday" -> data.complaint().payday();
			case "complaint.contractMethod" -> contractMethod(data.complaint().contractMethod());
			case "complaint.details" -> data.complaint().details();
			case "complaint.attachmentFileNames" ->
				String.join(", ", data.complaint().attachmentFileNames());
			case "submission.recipientLaborOfficeName" -> data.submission().recipientLaborOfficeName();
			default -> throw new IllegalStateException("Unsupported mapped field: " + field.fieldId());
		};
		String value = formatRawValue(rawValue);
		if (value == null || value.isBlank()) {
			return field.emptyValue();
		}
		if (field.maxLength() != null && value.length() > field.maxLength()) {
			throw new IllegalArgumentException("Field exceeds maximum length: " + field.fieldId());
		}
		return value;
	}

	private String formatRawValue(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof java.time.LocalDate date) {
			return DateTimeFormatter.ISO_LOCAL_DATE.format(date);
		}
		return value.toString();
	}

	private String yesNo(Boolean value) {
		if (value == null) {
			return null;
		}
		return value ? "☑ 예     □ 아니오" : "□ 예     ☑ 아니오";
	}

	private String workplaceType(AnalysisOutcome.WorkplaceType value) {
		if (value == null) {
			return null;
		}
		return value == AnalysisOutcome.WorkplaceType.WORKPLACE
			? "☑ 사업장     □ 공사현장"
			: "□ 사업장     ☑ 공사현장";
	}

	private String employmentStatus(AnalysisOutcome.EmploymentStatus value) {
		if (value == null) {
			return null;
		}
		return value == AnalysisOutcome.EmploymentStatus.RESIGNED
			? "☑ 퇴직     □ 재직"
			: "□ 퇴직     ☑ 재직";
	}

	private String contractMethod(AnalysisOutcome.ContractMethod value) {
		if (value == null) {
			return null;
		}
		return value == AnalysisOutcome.ContractMethod.WRITTEN
			? "☑ 서면     □ 구두"
			: "□ 서면     ☑ 구두";
	}

	private String money(Long value) {
		return value == null ? null : String.format(Locale.KOREA, "%,d원", value);
	}

	private void applyValue(Document document, Target target, String value) {
		switch (target.kind()) {
			case TABLE_CELL -> setTableCellText(document, target, value);
			case TEXT_MATCH -> replaceMatchedText(document, target, value);
		}
	}

	private void setTableCellText(Document document, Target target, String value) {
		NodeList tables = document.getElementsByTagNameNS("*", "tbl");
		if (target.tableIndex() == null || target.tableIndex() >= tables.getLength()) {
			throw new IllegalStateException("Mapped table was not found");
		}
		Element table = (Element) tables.item(target.tableIndex());
		NodeList cells = table.getElementsByTagNameNS("*", "tc");
		for (int index = 0; index < cells.getLength(); index++) {
			Element cell = (Element) cells.item(index);
			NodeList addresses = cell.getElementsByTagNameNS("*", "cellAddr");
			if (addresses.getLength() == 0) {
				continue;
			}
			Element address = (Element) addresses.item(0);
			if (Integer.toString(target.row()).equals(address.getAttribute("rowAddr"))
				&& Integer.toString(target.column()).equals(address.getAttribute("colAddr"))) {
				setCellText(document, cell, value);
				return;
			}
		}
		throw new IllegalStateException("Mapped table cell was not found");
	}

	private void setCellText(Document document, Element cell, String value) {
		NodeList textNodes = cell.getElementsByTagNameNS("*", "t");
		if (textNodes.getLength() > 0) {
			textNodes.item(0).setTextContent(value);
			for (int index = 1; index < textNodes.getLength(); index++) {
				textNodes.item(index).setTextContent("");
			}
			return;
		}
		NodeList runs = cell.getElementsByTagNameNS("*", "run");
		if (runs.getLength() == 0) {
			throw new IllegalStateException("Mapped table cell has no text run");
		}
		Element text = document.createElementNS(PARAGRAPH_NAMESPACE, "hp:t");
		text.setTextContent(value);
		runs.item(0).appendChild(text);
	}

	private void replaceMatchedText(Document document, Target target, String value) {
		NodeList textNodes = document.getElementsByTagNameNS("*", "t");
		List<Element> matches = new ArrayList<>();
		for (int index = 0; index < textNodes.getLength(); index++) {
			Element text = (Element) textNodes.item(index);
			if (Objects.equals(target.matchText(), text.getTextContent())) {
				matches.add(text);
			}
		}
		if (matches.size() != 1) {
			throw new IllegalStateException("Mapped paragraph text must occur exactly once");
		}
		String replacement = target.valuePattern() == null
			? value
			: target.valuePattern().formatted(value);
		matches.getFirst().setTextContent(replacement);
	}

	private Map<String, TemplateEntry> readTemplateEntries() {
		Map<String, TemplateEntry> entries = new LinkedHashMap<>();
		int totalBytes = 0;
		try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(templateBytes))) {
			ZipEntry entry;
			while ((entry = input.getNextEntry()) != null) {
				if (entries.size() >= MAX_TEMPLATE_ENTRY_COUNT) {
					throw new IllegalStateException("Template has too many ZIP entries");
				}
				validateEntryName(entry.getName());
				byte[] content = input.readAllBytes();
				totalBytes += content.length;
				if (totalBytes > MAX_TEMPLATE_UNCOMPRESSED_BYTES) {
					throw new IllegalStateException("Template is too large after decompression");
				}
				TemplateEntry previous = entries.put(entry.getName(), new TemplateEntry(entry, content));
				if (previous != null) {
					throw new IllegalStateException("Template has duplicate ZIP entries");
				}
			}
		}
		catch (IOException exception) {
			throw new IllegalStateException("Could not read the HWPX template", exception);
		}
		return entries;
	}

	private void validatePackage(Map<String, TemplateEntry> entries) {
		if (!entries.keySet().containsAll(REQUIRED_ENTRIES)) {
			throw new IllegalStateException("Template is missing required HWPX entries");
		}
		String mimeType = new String(requireEntry(entries, "mimetype").content(), StandardCharsets.UTF_8);
		if (!HWPX_MIME_TYPE.equals(mimeType)) {
			throw new IllegalStateException("Template has an invalid HWPX MIME type");
		}
		for (Map.Entry<String, TemplateEntry> entry : entries.entrySet()) {
			if (entry.getKey().endsWith(".xml") || entry.getKey().endsWith(".hpf")) {
				parseXml(entry.getValue().content());
			}
		}
	}

	private byte[] writePackage(Map<String, TemplateEntry> entries) {
		try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
			 ZipOutputStream output = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
			for (Map.Entry<String, TemplateEntry> item : entries.entrySet()) {
				byte[] content = item.getValue().content();
				ZipEntry source = item.getValue().source();
				ZipEntry target = new ZipEntry(item.getKey());
				target.setMethod(source.getMethod());
				if (source.getTime() >= 0) {
					target.setTime(source.getTime());
				}
				if (source.getMethod() == ZipEntry.STORED) {
					CRC32 crc = new CRC32();
					crc.update(content);
					target.setSize(content.length);
					target.setCompressedSize(content.length);
					target.setCrc(crc.getValue());
				}
				output.putNextEntry(target);
				output.write(content);
				output.closeEntry();
			}
			output.finish();
			return bytes.toByteArray();
		}
		catch (IOException exception) {
			throw new IllegalStateException("Could not create the HWPX document", exception);
		}
	}

	private Document parseXml(byte[] bytes) {
		try {
			DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			factory.setNamespaceAware(true);
			factory.setXIncludeAware(false);
			factory.setExpandEntityReferences(false);
			factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
			factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
			factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
			return factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
		}
		catch (Exception exception) {
			throw new IllegalStateException("HWPX contains invalid XML", exception);
		}
	}

	private byte[] serialize(Document document) {
		try {
			TransformerFactory factory = TransformerFactory.newInstance();
			factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
			factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
			factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
			var transformer = factory.newTransformer();
			transformer.setOutputProperty(OutputKeys.ENCODING, StandardCharsets.UTF_8.name());
			transformer.setOutputProperty(OutputKeys.INDENT, "no");
			ByteArrayOutputStream output = new ByteArrayOutputStream();
			transformer.transform(new DOMSource(document), new StreamResult(output));
			return output.toByteArray();
		}
		catch (Exception exception) {
			throw new IllegalStateException("Could not serialize HWPX XML", exception);
		}
	}

	private TemplateMapping readMapping(ObjectMapper objectMapper) {
		try (InputStream input = HwpxFormGenerator.class.getResourceAsStream(MAPPING_RESOURCE)) {
			if (input == null) {
				throw new IllegalStateException("HWPX field mapping resource is missing");
			}
			return objectMapper.readValue(input, TemplateMapping.class);
		}
		catch (IOException exception) {
			throw new IllegalStateException("Could not read HWPX field mapping", exception);
		}
	}

	private void validateMapping() {
		if (!LABOR_COMPLAINT_TEMPLATE_ID.equals(mapping.templateId())) {
			throw new IllegalStateException("HWPX mapping has an unexpected template ID");
		}
		if (!LABOR_COMPLAINT_TEMPLATE_VERSION.equals(mapping.templateVersion())) {
			throw new IllegalStateException("HWPX mapping has an unexpected template version");
		}
		if (mapping.fields() == null || mapping.fields().isEmpty()) {
			throw new IllegalStateException("HWPX mapping has no fields");
		}
		Set<String> uniqueFieldIds = new java.util.HashSet<>();
		for (FieldMapping field : mapping.fields()) {
			if (!uniqueFieldIds.add(field.fieldId())) {
				throw new IllegalStateException("HWPX mapping has duplicate field IDs");
			}
			if (field.target() == null || field.target().entry() == null) {
				throw new IllegalStateException("HWPX mapping field has no target");
			}
		}
	}

	private TemplateEntry requireEntry(Map<String, TemplateEntry> entries, String name) {
		TemplateEntry entry = entries.get(name);
		if (entry == null) {
			throw new IllegalStateException("Mapped HWPX entry is missing");
		}
		return entry;
	}

	private static byte[] readResource(String path) {
		try (InputStream input = HwpxFormGenerator.class.getResourceAsStream(path)) {
			if (input == null) {
				throw new IllegalStateException("HWPX template resource is missing");
			}
			return input.readAllBytes();
		}
		catch (IOException exception) {
			throw new IllegalStateException("Could not read the HWPX template", exception);
		}
	}

	private void validateEntryName(String name) {
		if (name == null || name.isBlank() || name.startsWith("/") || name.contains("\\")) {
			throw new IllegalStateException("Template has an unsafe ZIP entry name");
		}
		for (String segment : name.split("/")) {
			if (segment.equals("..")) {
				throw new IllegalStateException("Template has an unsafe ZIP entry path");
			}
		}
	}

	private String requireGeneratedId(String value) {
		if (value == null || value.isBlank()) {
			throw new IllegalStateException("Generated document ID must not be blank");
		}
		return value;
	}

	private record TemplateEntry(ZipEntry source, byte[] content) {
	}

	private record TemplateMapping(
		String templateId,
		String templateVersion,
		String originalFormName,
		String officialIdentifier,
		String originalSourceFileName,
		List<FieldMapping> fields
	) {
	}

	private record FieldMapping(
		String fieldId,
		String displayName,
		String dataType,
		boolean required,
		Integer maxLength,
		Target target,
		String emptyValue,
		boolean repeated
	) {
	}

	private record Target(
		String entry,
		TargetKind kind,
		Integer tableIndex,
		Integer row,
		Integer column,
		String matchText,
		String valuePattern
	) {
	}

	private enum TargetKind {
		TABLE_CELL,
		TEXT_MATCH
	}
}
