package com.compnet.hris.employee;

import com.compnet.hris.common.EmploymentStatus;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {
    long countByStatus(EmploymentStatus status);
    long countByStatusAndHiredAtGreaterThanEqual(EmploymentStatus status, LocalDate date);

    @Query("select count(e) from Employee e where e.status = :status and e.position = :position")
    long countByStatusAndPosition(@Param("status") EmploymentStatus status,
                                  @Param("position") com.compnet.hris.common.Position position);
}
