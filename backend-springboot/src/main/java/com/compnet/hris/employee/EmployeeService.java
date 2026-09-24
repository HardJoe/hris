package com.compnet.hris.employee;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.InvalidRequestException;
import com.compnet.hris.common.PageResult;
import com.compnet.hris.common.Position;
import com.compnet.hris.common.ResourceNotFoundException;
import com.compnet.hris.competency.Competency;
import com.compnet.hris.competency.CompetencyRepository;
import jakarta.persistence.criteria.JoinType;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class EmployeeService {
    private final EmployeeRepository employees;
    private final EmployeeCompetencyRepository assignments;
    private final CompetencyRepository competencies;
    private final CertificateStorageService storage;

    public EmployeeService(EmployeeRepository employees, EmployeeCompetencyRepository assignments,
            CompetencyRepository competencies, CertificateStorageService storage) {
        this.employees = employees; this.assignments = assignments;
        this.competencies = competencies; this.storage = storage;
    }

    @Transactional
    public EmployeeDto.View create(EmployeeDto.Create input) {
        validateDates(input.dateOfBirth(), input.hiredAt());
        List<EmployeeDto.Assignment> requested = input.competencies() == null ? List.of() : input.competencies();
        assertUnique(requested);
        Employee employee = new Employee(normalizeName(input.name()), input.gender(), input.dateOfBirth(),
                normalizeEmail(input.email()), input.position(),
                input.status() == null ? EmploymentStatus.ACTIVE : input.status(), input.hiredAt());
        requested.forEach(item -> employee.getCompetencies().add(
                new EmployeeCompetency(employee, getCompetency(item.competencyId()), item.grade())));
        return EmployeeDto.View.from(employees.save(employee));
    }

    public PageResult<EmployeeDto.View> findAll(int page, int limit, String search,
            Position position, EmploymentStatus status, UUID competencyId) {
        Specification<Employee> specification = Specification.unrestricted();
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            specification = specification.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), pattern), cb.like(cb.lower(root.get("email")), pattern)));
        }
        if (position != null) specification = specification.and((root, query, cb) -> cb.equal(root.get("position"), position));
        if (status != null) specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
        if (competencyId != null) specification = specification.and((root, query, cb) ->
                cb.equal(root.join("competencies", JoinType.INNER).get("competency").get("id"), competencyId));
        var result = employees.findAll(specification,
                PageRequest.of(page - 1, limit, Sort.by("name").ascending()));
        return PageResult.from(result.map(EmployeeDto.View::from));
    }

    public EmployeeDto.View findOne(UUID id) { return EmployeeDto.View.from(getEmployee(id)); }

    @Transactional
    public EmployeeDto.View update(UUID id, EmployeeDto.Update input) {
        Employee employee = getEmployee(id);
        LocalDate birth = input.dateOfBirth() == null ? employee.getDateOfBirth() : input.dateOfBirth();
        LocalDate hired = input.hiredAt() == null ? employee.getHiredAt() : input.hiredAt();
        validateDates(birth, hired);
        employee.update(input.name() == null ? employee.getName() : normalizeName(input.name()),
                input.gender() == null ? employee.getGender() : input.gender(), birth,
                input.email() == null ? employee.getEmail() : normalizeEmail(input.email()),
                input.position() == null ? employee.getPosition() : input.position(),
                input.status() == null ? employee.getStatus() : input.status(), hired);
        if (input.competencies() != null) replaceAssignments(employee, input.competencies());
        return EmployeeDto.View.from(employees.save(employee));
    }

    @Transactional
    public void remove(UUID id) {
        Employee employee = getEmployee(id);
        employee.getCompetencies().forEach(item -> removeAfterCommit(item.getCertificateStoredName()));
        employee.getCompetencies().clear();
        employee.softDelete();
        employees.save(employee);
    }

    @Transactional
    public EmployeeDto.View assign(UUID employeeId, UUID competencyId, com.compnet.hris.common.Grade grade) {
        Employee employee = getEmployee(employeeId);
        EmployeeCompetency assignment = assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)
                .orElseGet(() -> {
                    EmployeeCompetency value = new EmployeeCompetency(employee, getCompetency(competencyId), grade);
                    employee.getCompetencies().add(value);
                    return value;
                });
        assignment.changeGrade(grade);
        assignments.save(assignment);
        return EmployeeDto.View.from(employee);
    }

    @Transactional
    public void unassign(UUID employeeId, UUID competencyId) {
        Employee employee = getEmployee(employeeId);
        EmployeeCompetency assignment = assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee competency assignment not found"));
        removeAfterCommit(assignment.getCertificateStoredName());
        employee.getCompetencies().remove(assignment);
        assignments.delete(assignment);
    }

    @Transactional
    public EmployeeDto.View upload(UUID employeeId, UUID competencyId, MultipartFile file) {
        Employee employee = getEmployee(employeeId);
        EmployeeCompetency assignment = assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee competency assignment not found"));
        var stored = storage.store(file);
        String previous = assignment.getCertificateStoredName();
        try {
            assignment.attach(stored.storedName(), stored.originalName(), stored.mimeType(), stored.size());
            assignments.saveAndFlush(assignment);
        } catch (RuntimeException exception) {
            storage.remove(stored.storedName());
            throw exception;
        }
        replaceAfterTransaction(previous, stored.storedName());
        return EmployeeDto.View.from(employee);
    }

    public CertificateDownload download(UUID employeeId, UUID competencyId) {
        getEmployee(employeeId);
        EmployeeCompetency value = assignments.findByEmployeeIdAndCompetencyId(employeeId, competencyId)
                .filter(item -> item.getCertificateStoredName() != null
                        && item.getCertificateOriginalName() != null
                        && item.getCertificateMimeType() != null
                        && item.getCertificateSize() != null)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found"));
        return new CertificateDownload(storage.open(value.getCertificateStoredName()),
                value.getCertificateOriginalName(), value.getCertificateMimeType(), value.getCertificateSize());
    }

    private void replaceAssignments(Employee employee, List<EmployeeDto.Assignment> requested) {
        assertUnique(requested);
        Set<UUID> retained = new HashSet<>();
        requested.forEach(item -> {
            retained.add(item.competencyId());
            employee.getCompetencies().stream()
                    .filter(existing -> existing.getCompetency().getId().equals(item.competencyId()))
                    .findFirst().ifPresentOrElse(existing -> existing.changeGrade(item.grade()),
                            () -> employee.getCompetencies().add(new EmployeeCompetency(employee,
                                    getCompetency(item.competencyId()), item.grade())));
        });
        employee.getCompetencies().removeIf(existing -> {
            boolean remove = !retained.contains(existing.getCompetency().getId());
            if (remove) removeAfterCommit(existing.getCertificateStoredName());
            return remove;
        });
    }

    private Employee getEmployee(UUID id) {
        return employees.findById(id).orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }
    private Competency getCompetency(UUID id) {
        return competencies.findById(id).orElseThrow(() -> new InvalidRequestException("One or more competencies do not exist"));
    }
    private void assertUnique(List<EmployeeDto.Assignment> values) {
        if (values.stream().map(EmployeeDto.Assignment::competencyId).distinct().count() != values.size())
            throw new InvalidRequestException("Each competency can only be assigned once");
    }
    private void validateDates(LocalDate birth, LocalDate hired) {
        if (!birth.isBefore(LocalDate.now())) throw new InvalidRequestException("dateOfBirth must be in the past");
        if (hired.isAfter(LocalDate.now())) throw new InvalidRequestException("hiredAt cannot be in the future");
        if (!birth.isBefore(hired)) throw new InvalidRequestException("dateOfBirth must be before hiredAt");
    }
    private String normalizeName(String value) { return value.trim().replaceAll("\\s+", " "); }
    private String normalizeEmail(String value) { return value.trim().toLowerCase(); }

    private void removeAfterCommit(String storedName) {
        if (storedName == null) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            storage.remove(storedName);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { storage.remove(storedName); }
        });
    }

    private void replaceAfterTransaction(String previousName, String newName) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            storage.remove(previousName);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { storage.remove(previousName); }
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) storage.remove(newName);
            }
        });
    }

    public record CertificateDownload(Resource resource, String originalName, String mimeType, Integer size) {}
}
