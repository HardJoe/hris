package com.compnet.hris.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.compnet.hris.common.InvalidRequestException;
import com.compnet.hris.common.ResourceNotFoundException;
import com.compnet.hris.config.HrisProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class CertificateStorageServiceTest {
    @TempDir Path tempDirectory;

    @Test
    void storesOpensAndRemovesPdfUsingSafeNames() throws Exception {
        CertificateStorageService service = service(1024);
        var file = new MockMultipartFile("certificate", "../unsafe.pdf", "text/plain",
                "%PDF-1.4\ncontent".getBytes());
        var stored = service.store(file);
        assertThat(stored.originalName()).isEqualTo("unsafe.pdf");
        assertThat(stored.mimeType()).isEqualTo("application/pdf");
        assertThat(new String(service.open(stored.storedName()).getContentAsByteArray())).startsWith("%PDF-");
        service.remove(stored.storedName());
        assertThatThrownBy(() -> service.open(stored.storedName())).isInstanceOf(ResourceNotFoundException.class);
        service.remove(null);
    }

    @Test
    void recognizesJpegAndPngSignatures() {
        CertificateStorageService service = service(1024);
        var jpeg = service.store(new MockMultipartFile("certificate", "photo.jpg", "image/jpeg",
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff, 1}));
        var png = service.store(new MockMultipartFile("certificate", "image.png", "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1}));
        assertThat(jpeg.mimeType()).isEqualTo("image/jpeg");
        assertThat(png.mimeType()).isEqualTo("image/png");
    }

    @Test
    void rejectsMissingOversizedAndInvalidFiles() {
        CertificateStorageService service = service(8);
        assertThatThrownBy(() -> service.store(null)).isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.store(new MockMultipartFile("certificate", new byte[0])))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.store(new MockMultipartFile("certificate", new byte[9])))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.store(new MockMultipartFile("certificate", new byte[]{1, 2, 3})))
                .isInstanceOf(InvalidRequestException.class);
    }

    private CertificateStorageService service(long maxBytes) {
        var properties = new HrisProperties(
                new HrisProperties.Jwt("a-secret-that-is-definitely-over-32-characters", "15m", "issuer", "audience"),
                new HrisProperties.Upload(tempDirectory, maxBytes), List.of(),
                new HrisProperties.BootstrapAdmin("", ""));
        return new CertificateStorageService(properties);
    }
}
