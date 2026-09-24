package com.compnet.hris.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "hris")
public record HrisProperties(
        Jwt jwt,
        Upload upload,
        List<String> corsOrigins,
        BootstrapAdmin bootstrapAdmin) {

    public record Jwt(@NotBlank @Size(min = 32) String secret, @NotBlank String expiresIn,
                      @NotBlank String issuer, @NotBlank String audience) {}

    public record Upload(Path directory, @Min(1024) @Max(10_485_760) long maxBytes) {}

    public record BootstrapAdmin(String email, String password) {}
}
