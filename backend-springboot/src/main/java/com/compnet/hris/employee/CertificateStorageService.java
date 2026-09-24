package com.compnet.hris.employee;

import com.compnet.hris.common.InvalidRequestException;
import com.compnet.hris.common.ResourceNotFoundException;
import com.compnet.hris.config.HrisProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CertificateStorageService {
    private static final byte[] PDF = {'%', 'P', 'D', 'F', '-'};
    private static final byte[] JPEG = {(byte) 0xff, (byte) 0xd8, (byte) 0xff};
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
    private final Path directory;
    private final long maxBytes;

    public CertificateStorageService(HrisProperties properties) {
        this.directory = properties.upload().directory().toAbsolutePath().normalize();
        this.maxBytes = properties.upload().maxBytes();
    }

    public StoredCertificate store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new InvalidRequestException("A certificate file is required");
        if (file.getSize() > maxBytes) throw new InvalidRequestException("Certificate exceeds the configured size limit");
        try {
            byte[] bytes = file.getBytes();
            FileType type = detect(bytes);
            if (type == null) throw new InvalidRequestException("Certificate must be a valid PDF, JPEG, or PNG file");
            Files.createDirectories(directory);
            String storedName = UUID.randomUUID() + "." + type.extension;
            Files.write(safePath(storedName), bytes, StandardOpenOption.CREATE_NEW);
            String original = safeOriginalName(file.getOriginalFilename());
            return new StoredCertificate(storedName, original, type.mimeType, bytes.length);
        } catch (IOException exception) {
            throw new IllegalStateException("Certificate storage failed", exception);
        }
    }

    public Resource open(String storedName) {
        try {
            Resource resource = new UrlResource(safePath(storedName).toUri());
            if (!resource.exists() || !resource.isReadable()) throw new ResourceNotFoundException("Certificate not found");
            return resource;
        } catch (IOException exception) {
            throw new ResourceNotFoundException("Certificate not found");
        }
    }

    public void remove(String storedName) {
        if (storedName == null) return;
        try { Files.deleteIfExists(safePath(storedName)); }
        catch (IOException exception) { throw new IllegalStateException("Certificate cleanup failed", exception); }
    }

    private Path safePath(String storedName) {
        Path result = directory.resolve(storedName).normalize();
        if (!result.startsWith(directory)) throw new ResourceNotFoundException("Certificate not found");
        return result;
    }

    private String safeOriginalName(String originalName) {
        if (originalName == null || originalName.isBlank()) return "certificate";
        String clean = Path.of(originalName.replace("\0", "").replace('\\', '/')).getFileName().toString();
        return clean.substring(0, Math.min(clean.length(), 255));
    }

    private FileType detect(byte[] bytes) {
        if (startsWith(bytes, PDF)) return new FileType("pdf", "application/pdf");
        if (startsWith(bytes, JPEG)) return new FileType("jpg", "image/jpeg");
        if (startsWith(bytes, PNG)) return new FileType("png", "image/png");
        return null;
    }

    private boolean startsWith(byte[] bytes, byte[] signature) {
        return bytes.length >= signature.length
                && Arrays.equals(Arrays.copyOf(bytes, signature.length), signature);
    }

    public record StoredCertificate(String storedName, String originalName, String mimeType, int size) {}
    private record FileType(String extension, String mimeType) {}
}
