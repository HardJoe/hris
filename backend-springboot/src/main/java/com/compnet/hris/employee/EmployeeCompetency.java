package com.compnet.hris.employee;

import com.compnet.hris.common.Grade;
import com.compnet.hris.competency.Competency;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "employee_competencies")
@IdClass(EmployeeCompetencyId.class)
public class EmployeeCompetency {
    @Id @ManyToOne @JoinColumn(name = "employee_id") private Employee employee;
    @Id @ManyToOne @JoinColumn(name = "competency_id") private Competency competency;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(nullable = false, columnDefinition = "competency_grade") private Grade grade;
    @Column(name = "certificate_stored_name") private String certificateStoredName;
    @Column(name = "certificate_original_name") private String certificateOriginalName;
    @Column(name = "certificate_mime_type") private String certificateMimeType;
    @Column(name = "certificate_size") private Integer certificateSize;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected EmployeeCompetency() {}
    public EmployeeCompetency(Employee employee, Competency competency, Grade grade) {
        this.employee = employee; this.competency = competency; this.grade = grade;
    }
    public void changeGrade(Grade grade) { this.grade = grade; }
    public void attach(String storedName, String originalName, String mimeType, int size) {
        this.certificateStoredName = storedName; this.certificateOriginalName = originalName;
        this.certificateMimeType = mimeType; this.certificateSize = size;
    }
    public Competency getCompetency() { return competency; }
    public Grade getGrade() { return grade; }
    public String getCertificateStoredName() { return certificateStoredName; }
    public String getCertificateOriginalName() { return certificateOriginalName; }
    public String getCertificateMimeType() { return certificateMimeType; }
    public Integer getCertificateSize() { return certificateSize; }
}
