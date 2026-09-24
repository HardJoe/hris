package com.compnet.hris.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.Position;
import com.compnet.hris.competency.CompetencyRepository;
import com.compnet.hris.employee.EmployeeRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {
    @Test
    void buildsActiveEmployeeSummaryIncludingZeroPositions() {
        EmployeeRepository employees = mock(EmployeeRepository.class);
        CompetencyRepository competencies = mock(CompetencyRepository.class);
        when(employees.countByStatus(EmploymentStatus.ACTIVE)).thenReturn(6L);
        when(employees.countByStatusAndPosition(EmploymentStatus.ACTIVE, Position.JUNIOR_PROGRAMMER)).thenReturn(2L);
        UUID competencyId = UUID.randomUUID();
        CompetencyRepository.CompetencyCount count = mock(CompetencyRepository.CompetencyCount.class);
        when(count.getCompetencyId()).thenReturn(competencyId);
        when(count.getName()).thenReturn("Spring Boot");
        when(count.getEmployeeCount()).thenReturn(3L);
        when(competencies.countActiveEmployees()).thenReturn(List.of(count));
        Clock clock = Clock.fixed(Instant.parse("2026-09-24T00:00:00Z"), ZoneOffset.UTC);
        DashboardService service = new DashboardService(employees, competencies, clock);

        var result = service.getSummary();

        assertThat(result.totalEmployees()).isEqualTo(6);
        assertThat(result.employeesByPosition()).containsEntry(Position.JUNIOR_PROGRAMMER, 2L)
                .containsEntry(Position.SENIOR_PROGRAMMER, 0L);
        assertThat(result.employeesByCompetency().getFirst().count()).isEqualTo(3);
        verify(employees).countByStatusAndHiredAtGreaterThanEqual(EmploymentStatus.ACTIVE,
                java.time.LocalDate.of(2026, 8, 24));
        verify(employees).countByStatusAndHiredAtGreaterThanEqual(EmploymentStatus.ACTIVE,
                java.time.LocalDate.of(2026, 6, 24));
    }
}
