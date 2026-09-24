package com.compnet.hris.competency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class CompetencyDto {
    private CompetencyDto() {}
    public record Create(@NotBlank @Size(min = 2, max = 100) String name) {
        public Create { if (name != null) name = normalize(name); }
    }
    public record Update(@Size(min = 2, max = 100) String name) {
        public Update { if (name != null) name = normalize(name); }
    }
    public record View(UUID id, String name, Instant createdAt, Instant updatedAt) {
        static View from(Competency value) {
            return new View(value.getId(), value.getName(), value.getCreatedAt(), value.getUpdatedAt());
        }
    }
    private static String normalize(String value) { return value.trim().replaceAll("\\s+", " "); }
}
