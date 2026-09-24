import { DashboardService } from '../src/dashboard/dashboard.service';
import { EmploymentStatus } from '../src/common/enums/employment-status.enum';
import { Position } from '../src/common/enums/position.enum';

describe('DashboardService', () => {
  it('returns active employee metrics and includes zero-count positions', async () => {
    const positionBuilder = {
      select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(), getRawMany: jest.fn(),
    };
    const newEmployeesBuilder = {
      select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), getRawOne: jest.fn(),
    };
    const competencyBuilder = {
      leftJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), getRawMany: jest.fn(),
    };
    positionBuilder.getRawMany.mockResolvedValue([{ key: Position.JUNIOR_PROGRAMMER, count: '2' }]);
    competencyBuilder.getRawMany.mockResolvedValue([{ competencyId: 'react', name: 'ReactJS', count: '2' }]);
    newEmployeesBuilder.getRawOne.mockResolvedValue({ lastOneMonth: '1', lastThreeMonths: '2' });
    const employees = {
      countBy: jest.fn().mockResolvedValue(2),
      createQueryBuilder: jest.fn().mockReturnValueOnce(positionBuilder).mockReturnValueOnce(newEmployeesBuilder),
    };
    const competencies = { createQueryBuilder: jest.fn(() => competencyBuilder) };
    const service = new DashboardService(employees as never, competencies as never);

    await expect(service.getSummary()).resolves.toEqual({
      totalEmployees: 2,
      employeesByPosition: {
        [Position.JUNIOR_PROGRAMMER]: 2,
        [Position.MID_PROGRAMMER]: 0,
        [Position.SENIOR_PROGRAMMER]: 0,
      },
      employeesByCompetency: [{ competencyId: 'react', name: 'ReactJS', count: 2 }],
      newEmployees: { lastOneMonth: 1, lastThreeMonths: 2 },
    });
    expect(employees.countBy).toHaveBeenCalledWith({ status: EmploymentStatus.ACTIVE });
  });
});
