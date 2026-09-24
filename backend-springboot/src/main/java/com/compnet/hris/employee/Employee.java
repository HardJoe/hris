package com.compnet.hris.employee;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.Gender;
import com.compnet.hris.common.Position;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "employees")
@SQLRestriction("deleted_at IS NULL")
public class Employee {
    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 150) private String name;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(nullable = false, columnDefinition = "employee_gender") private Gender gender;
    @Column(name = "date_of_birth", nullable = false) private LocalDate dateOfBirth;
    @Column(nullable = false, length = 254) private String email;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(nullable = false, columnDefinition = "employee_position") private Position position;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(nullable = false, columnDefinition = "employment_status") private EmploymentStatus status = EmploymentStatus.ACTIVE;
    @Column(name = "hired_at", nullable = false) private LocalDate hiredAt;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmployeeCompetency> competencies = new ArrayList<>();

    protected Employee() {}
    public Employee(String name, Gender gender, LocalDate dateOfBirth, String email, Position position,
                    EmploymentStatus status, LocalDate hiredAt) {
        update(name, gender, dateOfBirth, email, position, status, hiredAt);
    }
    public void update(String name, Gender gender, LocalDate dateOfBirth, String email,
                       Position position, EmploymentStatus status, LocalDate hiredAt) {
        this.name = name; this.gender = gender; this.dateOfBirth = dateOfBirth; this.email = email;
        this.position = position; this.status = status; this.hiredAt = hiredAt;
    }
    public void softDelete() { this.deletedAt = Instant.now(); }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public Gender getGender() { return gender; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public String getEmail() { return email; }
    public Position getPosition() { return position; }
    public EmploymentStatus getStatus() { return status; }
    public LocalDate getHiredAt() { return hiredAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<EmployeeCompetency> getCompetencies() { return competencies; }
}
