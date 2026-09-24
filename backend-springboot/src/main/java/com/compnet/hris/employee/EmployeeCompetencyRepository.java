package com.compnet.hris.employee;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeCompetencyRepository extends JpaRepository<EmployeeCompetency, EmployeeCompetencyId> {
    Optional<EmployeeCompetency> findByEmployeeIdAndCompetencyId(UUID employeeId, UUID competencyId);
}
