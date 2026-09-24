package com.compnet.hris.dashboard;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.Position;
import com.compnet.hris.competency.CompetencyRepository;
import com.compnet.hris.employee.EmployeeRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {
    private final EmployeeRepository employees;
    private final CompetencyRepository competencies;
    private final Clock clock;

    public DashboardService(EmployeeRepository employees, CompetencyRepository competencies) {
        this(employees, competencies, Clock.systemDefaultZone());
    }
    DashboardService(EmployeeRepository employees, CompetencyRepository competencies, Clock clock) {
        this.employees = employees; this.competencies = competencies; this.clock = clock;
    }

    public Summary getSummary() {
        Map<Position, Long> positions = new EnumMap<>(Position.class);
        for (Position position : Position.values())
            positions.put(position, employees.countByStatusAndPosition(EmploymentStatus.ACTIVE, position));
        LocalDate today = LocalDate.now(clock);
        var competencyCounts = competencies.countActiveEmployees().stream()
                .map(value -> new CompetencyCount(value.getCompetencyId(), value.getName(), value.getEmployeeCount()))
                .toList();
        return new Summary(employees.countByStatus(EmploymentStatus.ACTIVE), positions, competencyCounts,
                new NewEmployees(employees.countByStatusAndHiredAtGreaterThanEqual(EmploymentStatus.ACTIVE, today.minusMonths(1)),
                        employees.countByStatusAndHiredAtGreaterThanEqual(EmploymentStatus.ACTIVE, today.minusMonths(3))));
    }

    public record Summary(long totalEmployees, Map<Position, Long> employeesByPosition,
                          List<CompetencyCount> employeesByCompetency, NewEmployees newEmployees) {}
    public record CompetencyCount(UUID competencyId, String name, long count) {}
    public record NewEmployees(long lastOneMonth, long lastThreeMonths) {}
}
