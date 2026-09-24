package com.compnet.hris.competency;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CompetencyRepository extends JpaRepository<Competency, UUID> {
    Page<Competency> findByNameContainingIgnoreCase(String search, Pageable pageable);

    @Query(value = """
            SELECT c.id AS competencyId, c.name AS name, COUNT(DISTINCT e.id) AS employeeCount
            FROM competencies c
            LEFT JOIN employee_competencies ec ON ec.competency_id = c.id
            LEFT JOIN employees e ON e.id = ec.employee_id AND e.status = 'ACTIVE' AND e.deleted_at IS NULL
            GROUP BY c.id, c.name ORDER BY c.name
            """, nativeQuery = true)
    java.util.List<CompetencyCount> countActiveEmployees();

    interface CompetencyCount {
        UUID getCompetencyId();
        String getName();
        long getEmployeeCount();
    }
}
