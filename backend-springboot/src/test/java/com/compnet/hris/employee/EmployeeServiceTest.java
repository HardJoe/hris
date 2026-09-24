package com.compnet.hris.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.Gender;
import com.compnet.hris.common.Grade;
import com.compnet.hris.common.InvalidRequestException;
import com.compnet.hris.common.Position;
import com.compnet.hris.common.ResourceNotFoundException;
import com.compnet.hris.competency.Competency;
import com.compnet.hris.competency.CompetencyRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class EmployeeServiceTest {
    private final EmployeeRepository employees = mock(EmployeeRepository.class);
    private final EmployeeCompetencyRepository assignments = mock(EmployeeCompetencyRepository.class);
    private final CompetencyRepository competencies = mock(CompetencyRepository.class);
    private final CertificateStorageService storage = mock(CertificateStorageService.class);
    private final EmployeeService service = new EmployeeService(employees, assignments, competencies, storage);
    private final UUID employeeId = UUID.randomUUID();
    private final UUID competencyId = UUID.randomUUID();
    private Competency competency;

    @BeforeEach
    void setUp() {
        competency = new Competency("Spring Boot");
        ReflectionTestUtils.setField(competency, "id", competencyId);
        when(competencies.findById(competencyId)).thenReturn(Optional.of(competency));
        when(employees.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsNormalizedEmployeeWithAssignmentsAndDefaultStatus() {
        var input = new EmployeeDto.Create("  Ayu   Pratama ", Gender.FEMALE,
                LocalDate.of(1995, 8, 17), " AYU@EXAMPLE.COM ", Position.MID_PROGRAMMER,
                null, LocalDate.now().minusDays(3), List.of(new EmployeeDto.Assignment(competencyId, Grade.A)));

        var result = service.create(input);

        assertThat(result.name()).isEqualTo("Ayu Pratama");
        assertThat(result.email()).isEqualTo("ayu@example.com");
        assertThat(result.status()).isEqualTo(EmploymentStatus.ACTIVE);
        assertThat(result.competencies()).extracting(EmployeeDto.CompetencyView::grade).containsExactly(Grade.A);
    }

    @Test
    void validatesEmploymentDatesAndUniqueAssignments() {
        assertThatThrownBy(() -> service.create(input(LocalDate.now(), LocalDate.now(), List.of())))
                .isInstanceOf(InvalidRequestException.class).hasMessage("dateOfBirth must be in the past");
        assertThatThrownBy(() -> service.create(input(LocalDate.of(1990, 1, 1), LocalDate.now().plusDays(1), List.of())))
                .isInstanceOf(InvalidRequestException.class).hasMessage("hiredAt cannot be in the future");
        assertThatThrownBy(() -> service.create(input(LocalDate.of(2020, 1, 1), LocalDate.of(2019, 1, 1), List.of())))
                .isInstanceOf(InvalidRequestException.class).hasMessage("dateOfBirth must be before hiredAt");
        var duplicate = new EmployeeDto.Assignment(competencyId, Grade.A);
        assertThatThrownBy(() -> service.create(input(LocalDate.of(1990, 1, 1), LocalDate.now(), List.of(duplicate, duplicate))))
                .isInstanceOf(InvalidRequestException.class).hasMessage("Each competency can only be assigned once");
    }

    @Test
    void rejectsUnknownEmployeeAndCompetency() {
        when(employees.findById(employeeId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findOne(employeeId)).isInstanceOf(ResourceNotFoundException.class);
        when(competencies.findById(competencyId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(input(LocalDate.of(1990, 1, 1), LocalDate.now(),
                List.of(new EmployeeDto.Assignment(competencyId, Grade.B)))))
                .isInstanceOf(InvalidRequestException.class).hasMessage("One or more competencies do not exist");
    }

    @Test
    void updatesFieldsAndReplacesAssignments() {
        Employee employee = employee();
        EmployeeCompetency old = new EmployeeCompetency(employee, competency, Grade.D);
        old.attach("old.pdf", "old.pdf", "application/pdf", 10);
        employee.getCompetencies().add(old);
        when(employees.findById(employeeId)).thenReturn(Optional.of(employee));

        var result = service.update(employeeId, new EmployeeDto.Update("Updated Name", null, null,
                "NEW@EXAMPLE.COM", Position.SENIOR_PROGRAMMER, EmploymentStatus.INACTIVE, null, List.of()));

        assertThat(result.name()).isEqualTo("Updated Name");
        assertThat(result.email()).isEqualTo("new@example.com");
        assertThat(result.position()).isEqualTo(Position.SENIOR_PROGRAMMER);
        assertThat(result.competencies()).isEmpty();
        verify(storage).remove("old.pdf");
    }

    @Test
    void assignsUpdatesAndRemovesCompetency() {
        Employee employee = employee();
        when(employees.findById(employeeId)).thenReturn(Optional.of(employee));
        when(assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)).thenReturn(Optional.empty());
        assertThat(service.assign(employeeId, competencyId, Grade.B).competencies()).hasSize(1);

        EmployeeCompetency assignment = employee.getCompetencies().getFirst();
        when(assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)).thenReturn(Optional.of(assignment));
        assertThat(service.assign(employeeId, competencyId, Grade.A).competencies().getFirst().grade()).isEqualTo(Grade.A);
        service.unassign(employeeId, competencyId);
        verify(assignments).delete(assignment);
        assertThat(employee.getCompetencies()).isEmpty();
    }

    @Test
    void reportsMissingAssignmentForRemoval() {
        when(employees.findById(employeeId)).thenReturn(Optional.of(employee()));
        when(assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.unassign(employeeId, competencyId)).isInstanceOf(ResourceNotFoundException.class);
        verify(storage, never()).remove(any());
    }

    @Test
    void uploadsDownloadsAndCleansPreviousCertificate() {
        Employee employee = employee();
        EmployeeCompetency assignment = new EmployeeCompetency(employee, competency, Grade.A);
        assignment.attach("old.pdf", "old.pdf", "application/pdf", 10);
        employee.getCompetencies().add(assignment);
        when(employees.findById(employeeId)).thenReturn(Optional.of(employee));
        when(assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)).thenReturn(Optional.of(assignment));
        when(storage.store(any())).thenReturn(new CertificateStorageService.StoredCertificate(
                "new.pdf", "certificate.pdf", "application/pdf", 20));
        var resource = mock(org.springframework.core.io.Resource.class);
        when(storage.open("new.pdf")).thenReturn(resource);

        var result = service.upload(employeeId, competencyId,
                new MockMultipartFile("certificate", "%PDF-test".getBytes()));
        var download = service.download(employeeId, competencyId);

        assertThat(result.competencies().getFirst().certificate().originalName()).isEqualTo("certificate.pdf");
        assertThat(download.resource()).isSameAs(resource);
        verify(storage).remove("old.pdf");
    }

    @Test
    void softDeletesEmployeeAndCertificateAssignments() {
        Employee employee = employee();
        EmployeeCompetency assignment = new EmployeeCompetency(employee, competency, Grade.A);
        assignment.attach("stored.pdf", "file.pdf", "application/pdf", 5);
        employee.getCompetencies().add(assignment);
        when(employees.findById(employeeId)).thenReturn(Optional.of(employee));
        service.remove(employeeId);
        assertThat(employee.getCompetencies()).isEmpty();
        verify(storage).remove("stored.pdf");
        verify(employees).save(employee);
    }

    private Employee employee() {
        Employee value = new Employee("Ayu", Gender.FEMALE, LocalDate.of(1995, 1, 1),
                "ayu@example.com", Position.MID_PROGRAMMER, EmploymentStatus.ACTIVE, LocalDate.of(2020, 1, 1));
        ReflectionTestUtils.setField(value, "id", employeeId);
        return value;
    }

    private EmployeeDto.Create input(LocalDate birth, LocalDate hired, List<EmployeeDto.Assignment> values) {
        return new EmployeeDto.Create("Ayu", Gender.FEMALE, birth, "ayu@example.com",
                Position.MID_PROGRAMMER, EmploymentStatus.ACTIVE, hired, values);
    }
}
