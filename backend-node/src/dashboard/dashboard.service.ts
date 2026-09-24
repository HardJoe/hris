import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competency } from '../competencies/entities/competency.entity';
import { EmploymentStatus } from '../common/enums/employment-status.enum';
import { Position } from '../common/enums/position.enum';
import { Employee } from '../employees/entities/employee.entity';

interface CountRow {
  key: string;
  count: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  employeesByPosition: Record<Position, number>;
  employeesByCompetency: Array<{ competencyId: string; name: string; count: number }>;
  newEmployees: { lastOneMonth: number; lastThreeMonths: number };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Employee) private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Competency)
    private readonly competenciesRepository: Repository<Competency>,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const activeStatus = EmploymentStatus.ACTIVE;
    const [totalEmployees, positionRows, competencyRows, newEmployeeRows] = await Promise.all([
      this.employeesRepository.countBy({ status: activeStatus }),
      this.employeesRepository
        .createQueryBuilder('employee')
        .select('employee.position', 'key')
        .addSelect('COUNT(employee.id)', 'count')
        .where('employee.status = :activeStatus', { activeStatus })
        .groupBy('employee.position')
        .getRawMany<CountRow>(),
      this.competenciesRepository
        .createQueryBuilder('competency')
        .leftJoin('competency.employeeAssignments', 'assignment')
        .leftJoin(
          'assignment.employee',
          'employee',
          'employee.status = :activeStatus AND employee.deletedAt IS NULL',
          { activeStatus },
        )
        .select('competency.id', 'competencyId')
        .addSelect('competency.name', 'name')
        .addSelect('COUNT(DISTINCT employee.id)', 'count')
        .groupBy('competency.id')
        .addGroupBy('competency.name')
        .orderBy('competency.name', 'ASC')
        .getRawMany<{ competencyId: string; name: string; count: string }>(),
      this.employeesRepository
        .createQueryBuilder('employee')
        .select(
          `COUNT(*) FILTER (WHERE employee.hiredAt >= CURRENT_DATE - INTERVAL '1 month')`,
          'lastOneMonth',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE employee.hiredAt >= CURRENT_DATE - INTERVAL '3 months')`,
          'lastThreeMonths',
        )
        .where('employee.status = :activeStatus', { activeStatus })
        .getRawOne<{ lastOneMonth: string; lastThreeMonths: string }>(),
    ]);

    const employeesByPosition = Object.fromEntries(
      Object.values(Position).map((position) => [position, 0]),
    ) as Record<Position, number>;
    for (const row of positionRows) employeesByPosition[row.key as Position] = Number(row.count);

    return {
      totalEmployees,
      employeesByPosition,
      employeesByCompetency: competencyRows.map((row) => ({
        competencyId: row.competencyId,
        name: row.name,
        count: Number(row.count),
      })),
      newEmployees: {
        lastOneMonth: Number(newEmployeeRows?.lastOneMonth ?? 0),
        lastThreeMonths: Number(newEmployeeRows?.lastThreeMonths ?? 0),
      },
    };
  }
}
