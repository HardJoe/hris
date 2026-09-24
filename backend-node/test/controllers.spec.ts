import { Readable } from 'stream';
import { AuthController } from '../src/auth/auth.controller';
import { CompetenciesController } from '../src/competencies/competencies.controller';
import { DashboardController } from '../src/dashboard/dashboard.controller';
import { EmployeesController } from '../src/employees/employees.controller';
import { HealthController } from '../src/health/health.controller';
import { Grade } from '../src/common/enums/grade.enum';

describe('HTTP controllers', () => {
  it('delegates authentication and dashboard requests', async () => {
    const authService = { login: jest.fn().mockResolvedValue({ accessToken: 'token' }) };
    const dashboardService = { getSummary: jest.fn().mockResolvedValue({ totalEmployees: 1 }) };
    const input = { email: 'admin@example.com', password: 'password123' };

    await expect(new AuthController(authService as never).login(input)).resolves.toEqual({ accessToken: 'token' });
    await expect(new DashboardController(dashboardService as never).getSummary()).resolves.toEqual({ totalEmployees: 1 });
    expect(authService.login).toHaveBeenCalledWith(input);
    expect(dashboardService.getSummary).toHaveBeenCalledTimes(1);
  });

  it('delegates every competency operation with its route arguments', async () => {
    const service = {
      create: jest.fn().mockResolvedValue({ id: '1' }), findAll: jest.fn().mockResolvedValue({ items: [] }),
      findOne: jest.fn().mockResolvedValue({ id: '1' }), update: jest.fn().mockResolvedValue({ id: '1' }), remove: jest.fn(),
    };
    const controller = new CompetenciesController(service as never);
    const input = { name: 'ReactJS' };
    const query = { page: 1, limit: 20 };

    await controller.create(input);
    await controller.findAll(query);
    await controller.findOne('competency-1');
    await controller.update('competency-1', input);
    await controller.remove('competency-1');
    expect(service.create).toHaveBeenCalledWith(input);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith('competency-1');
    expect(service.update).toHaveBeenCalledWith('competency-1', input);
    expect(service.remove).toHaveBeenCalledWith('competency-1');
  });

  it('delegates employee operations and supplies competency grades', async () => {
    const service = {
      create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn(),
      assignCompetency: jest.fn(), unassignCompetency: jest.fn(), uploadCertificate: jest.fn(),
      downloadCertificate: jest.fn().mockResolvedValue({
        stream: Readable.from('certificate'), originalName: "Ayu's certificate.pdf", mimeType: 'application/pdf', size: 11,
      }),
    };
    const controller = new EmployeesController(service as never);
    const input = { name: 'Ayu' };
    const uploaded = {} as Express.Multer.File;

    await controller.create(input as never);
    await controller.findAll({ page: 1, limit: 20 });
    await controller.findOne('employee-1');
    await controller.update('employee-1', input);
    await controller.remove('employee-1');
    await controller.assignCompetency('employee-1', 'competency-1', { grade: Grade.A });
    await controller.unassignCompetency('employee-1', 'competency-1');
    await controller.uploadCertificate('employee-1', 'competency-1', uploaded);
    const downloaded = await controller.downloadCertificate('employee-1', 'competency-1');

    expect(service.assignCompetency).toHaveBeenCalledWith('employee-1', 'competency-1', Grade.A);
    expect(service.uploadCertificate).toHaveBeenCalledWith('employee-1', 'competency-1', uploaded);
    expect(downloaded.getHeaders()).toMatchObject({
      type: 'application/pdf', length: 11, disposition: "attachment; filename*=UTF-8''Ayu%27s%20certificate.pdf",
    });
  });

  it('returns liveness and verifies database readiness', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(dataSource as never);

    expect(controller.liveness()).toEqual({ status: 'ok' });
    await expect(controller.readiness()).resolves.toEqual({ status: 'ready' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
