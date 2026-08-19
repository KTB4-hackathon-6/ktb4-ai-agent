package com.ktb4.aiagent.contract.service;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;
import org.springframework.web.multipart.MultipartFile;

final class BufferedMultipartFile implements MultipartFile {

	private final String name;
	private final String originalFilename;
	private final String contentType;
	private final byte[] content;

	BufferedMultipartFile(MultipartFile source) throws IOException {
		this.name = source.getName();
		this.originalFilename = source.getOriginalFilename();
		this.contentType = source.getContentType();
		this.content = source.getBytes();
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public String getOriginalFilename() {
		return originalFilename;
	}

	@Override
	public String getContentType() {
		return contentType;
	}

	@Override
	public boolean isEmpty() {
		return content.length == 0;
	}

	@Override
	public long getSize() {
		return content.length;
	}

	@Override
	public byte[] getBytes() {
		return Arrays.copyOf(content, content.length);
	}

	@Override
	public InputStream getInputStream() {
		return new ByteArrayInputStream(content);
	}

	@Override
	public void transferTo(File destination) throws IOException {
		transferTo(destination.toPath());
	}

	@Override
	public void transferTo(Path destination) throws IOException {
		Files.write(destination, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
	}
}
