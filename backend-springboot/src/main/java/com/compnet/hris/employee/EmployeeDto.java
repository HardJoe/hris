package com.compnet.hris.employee;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.Gender;
import com.compnet.hris.common.Grade;
import com.compnet.hris.common.Position;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class EmployeeDto {
    private EmployeeDto() {}
    public record Assignment(@NotNull UUID competencyId, @NotNull Grade grade) {}
    public record Create(
            @NotBlank @Size(min = 2, max = 150) String name,
            @NotNull Gender gender,
            @NotNull LocalDate dateOfBirth,
            @NotBlank @Email @Size(max = 254) String email,
            @NotNull Position position,
            EmploymentStatus status,
            @NotNull LocalDate hiredAt,
            List<@NotNull @Valid Assignment> competencies) {
        public Create {
            if (name != null) name = normalizeName(name);
            if (email != null) email = email.trim().toLowerCase();
        }
    }
    public record Update(
            @Size(min = 2, max = 150) String name,
            Gender gender,
            LocalDate dateOfBirth,
            @Email @Size(max = 254) String email,
            Position position,
            EmploymentStatus status,
            LocalDate hiredAt,
            List<@NotNull @Valid Assignment> competencies) {
        public Update {
            if (name != null) name = normalizeName(name);
            if (email != null) email = email.trim().toLowerCase();
        }
    }
    public record GradeUpdate(@NotNull Grade grade) {}
    public record Certificate(boolean available, String originalName, String mimeType, Integer size) {}
    public record CompetencyView(UUID id, String name, Grade grade, Certificate certificate) {}
    public record View(UUID id, String name, Gender gender, LocalDate dateOfBirth, String email,
            Position position, EmploymentStatus status, LocalDate hiredAt,
            List<CompetencyView> competencies, Instant createdAt, Instant updatedAt) {
        static View from(Employee employee) {
            var assignments = employee.getCompetencies().stream()
                    .sorted(java.util.Comparator.comparing(value -> value.getCompetency().getName()))
                    .map(value -> new CompetencyView(
                    value.getCompetency().getId(), value.getCompetency().getName(), value.getGrade(),
                    new Certificate(value.getCertificateStoredName() != null,
                            value.getCertificateOriginalName(), value.getCertificateMimeType(),
                            value.getCertificateSize()))).toList();
            return new View(employee.getId(), employee.getName(), employee.getGender(),
                    employee.getDateOfBirth(), employee.getEmail(), employee.getPosition(),
                    employee.getStatus(), employee.getHiredAt(), assignments,
                    employee.getCreatedAt(), employee.getUpdatedAt());
        }
    }
    private static String normalizeName(String value) { return value.trim().replaceAll("\\s+", " "); }
}
