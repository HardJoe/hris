import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from '../src/employees/employees.service';
import { EmploymentStatus } from '../src/common/enums/employment-status.enum';
import { Gender } from '../src/common/enums/gender.enum';
import { Grade } from '../src/common/enums/grade.enum';
import { Position } from '../src/common/enums/position.enum';

type TransactionCallback = (manager: {
  getRepository: (entity: { name: string }) => unknown;
}) => Promise<unknown>;

describe('EmployeesService', () => {
  const employee = {
    id: 'employee-1', name: 'Ayu Pratama', gender: Gender.FEMALE, dateOfBirth: '1995-08-17',
    email: 'ayu@example.com', position: Position.JUNIOR_PROGRAMMER, status: EmploymentStatus.ACTIVE,
    hiredAt: '2025-09-01', competencies: [], createdAt: new Date('2025-09-01'), updatedAt: new Date('2025-09-01'),
  };
  let employeesRepository: Record<string, jest.Mock>;
  let assignmentsRepository: Record<string, jest.Mock>;
  let competenciesRepository: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let certificateStorage: Record<string, jest.Mock>;
  let service: EmployeesService;

  beforeEach(() => {
    employeesRepository = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
    assignmentsRepository = { findOneBy: jest.fn(), remove: jest.fn(), save: jest.fn() };
    competenciesRepository = { countBy: jest.fn() };
    dataSource = { transaction: jest.fn() };
    certificateStorage = { store: jest.fn(), remove: jest.fn(), open: jest.fn() };
    service = new EmployeesService(
      employeesRepository as never,
      assignmentsRepository as never,
      competenciesRepository as never,
      dataSource as never,
      certificateStorage as never,
    );
  });

  it('rejects impossible employment dates before starting a database transaction', async () => {
    await expect(
      service.create({
        name: 'Ayu Pratama', gender: Gender.FEMALE, email: 'ayu@example.com',
        position: Position.JUNIOR_PROGRAMMER, dateOfBirth: '2025-09-01', hiredAt: '2025-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates assignments transactionally and returns the employee view', async () => {
    const employeeWriteRepository = {
      create: jest.fn((value: Record<string, unknown>) => ({ ...value })),
      save: jest.fn().mockResolvedValue(employee),
    };
    const competencyWriteRepository = { countBy: jest.fn().mockResolvedValue(1) };
    const assignmentWriteRepository = { insert: jest.fn().mockResolvedValue(undefined) };
    dataSource.transaction.mockImplementation((callback: TransactionCallback) => callback({
      getRepository: jest.fn((entity: { name: string }): unknown => {
        if (entity.name === 'Employee') return employeeWriteRepository;
        if (entity.name === 'Competency') return competencyWriteRepository;
        return assignmentWriteRepository;
      }),
    }));
    employeesRepository.findOne.mockResolvedValue({
      ...employee,
      competencies: [{ competency: { id: 'react', name: 'ReactJS' }, grade: Grade.B, certificateStoredName: null,
        certificateOriginalName: null, certificateMimeType: null, certificateSize: null }],
    });

    await expect(service.create({
      name: employee.name, gender: employee.gender, dateOfBirth: employee.dateOfBirth, email: employee.email,
      position: employee.position, hiredAt: employee.hiredAt, competencies: [{ competencyId: 'react', grade: Grade.B }],
    })).resolves.toMatchObject({ id: employee.id, competencies: [{ id: 'react', grade: Grade.B }] });
    expect(assignmentWriteRepository.insert).toHaveBeenCalledWith([
      { employeeId: employee.id, competencyId: 'react', grade: Grade.B },
    ]);
  });

  it('rejects duplicate competency assignments inside the transaction', async () => {
    dataSource.transaction.mockImplementation((callback: TransactionCallback) => callback({ getRepository: jest.fn() }));

    await expect(service.create({
      name: employee.name, gender: employee.gender, dateOfBirth: employee.dateOfBirth, email: employee.email,
      position: employee.position, hiredAt: employee.hiredAt,
      competencies: [{ competencyId: 'react', grade: Grade.A }, { competencyId: 'react', grade: Grade.B }],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies every employee list filter and returns pagination metadata', async () => {
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn(),
    };
    employeesRepository.createQueryBuilder.mockReturnValue(builder);
    builder.getManyAndCount.mockResolvedValue([[employee], 3]);

    await expect(service.findAll({
      page: 2, limit: 1, search: 'Ayu', position: Position.JUNIOR_PROGRAMMER,
      status: EmploymentStatus.ACTIVE, competencyId: 'react',
    })).resolves.toMatchObject({ meta: { page: 2, limit: 1, totalItems: 3, totalPages: 3 } });
    expect(builder.andWhere).toHaveBeenCalledTimes(4);
    expect(builder.skip).toHaveBeenCalledWith(1);
  });

  it('soft-deletes an employee and removes every assigned certificate', async () => {
    const employeeWriteRepository = { findOneBy: jest.fn().mockResolvedValue(employee), softRemove: jest.fn() };
    const assignmentWriteRepository = {
      findBy: jest.fn().mockResolvedValue([{ certificateStoredName: 'one.pdf' }, { certificateStoredName: null }]),
      remove: jest.fn(),
    };
    dataSource.transaction.mockImplementation((callback: TransactionCallback) => callback({
      getRepository: jest.fn((entity: { name: string }): unknown =>
        entity.name === 'Employee' ? employeeWriteRepository : assignmentWriteRepository),
    }));

    await service.remove(employee.id);
    expect(assignmentWriteRepository.remove).toHaveBeenCalledTimes(1);
    expect(employeeWriteRepository.softRemove).toHaveBeenCalledWith(employee);
    expect(certificateStorage.remove).toHaveBeenCalledWith('one.pdf');
  });

  it('replaces competency assignments and removes certificates from removed assignments', async () => {
    const employeeWriteRepository = { findOneBy: jest.fn().mockResolvedValue(employee), merge: jest.fn(), save: jest.fn() };
    const assignmentWriteRepository = {
      findBy: jest.fn().mockResolvedValue([{ competencyId: 'node', certificateStoredName: 'node.pdf' }]),
      remove: jest.fn(), insert: jest.fn(), update: jest.fn(),
    };
    dataSource.transaction.mockImplementation((callback: TransactionCallback) => callback({
      getRepository: jest.fn((entity: { name: string }): unknown =>
        entity.name === 'Employee' ? employeeWriteRepository : assignmentWriteRepository),
    }));
    employeesRepository.findOne.mockResolvedValue(employee);

    await expect(service.update(employee.id, { competencies: [] })).resolves.toMatchObject({ id: employee.id });
    expect(assignmentWriteRepository.remove).toHaveBeenCalledTimes(1);
    expect(certificateStorage.remove).toHaveBeenCalledWith('node.pdf');
  });

  it('assigns an existing competency and returns the refreshed employee', async () => {
    employeesRepository.findOne.mockResolvedValue(employee);
    competenciesRepository.countBy.mockResolvedValue(1);
    assignmentsRepository.upsert = jest.fn().mockResolvedValue(undefined);

    await expect(service.assignCompetency(employee.id, 'react', Grade.A)).resolves.toMatchObject({ id: employee.id });
    expect(assignmentsRepository.upsert).toHaveBeenCalledWith(
      { employeeId: employee.id, competencyId: 'react', grade: Grade.A }, ['employeeId', 'competencyId'],
    );
  });

  it('removes a newly stored certificate if its database update fails', async () => {
    employeesRepository.findOne.mockResolvedValue(employee);
    competenciesRepository.countBy.mockResolvedValue(1);
    const assignment = { employeeId: employee.id, competencyId: 'react', certificateStoredName: null };
    assignmentsRepository.findOneBy.mockResolvedValue(assignment);
    assignmentsRepository.save.mockRejectedValue(new Error('database unavailable'));
    certificateStorage.store.mockResolvedValue({
      storedName: 'new.pdf', originalName: 'certificate.pdf', mimeType: 'application/pdf', size: 12,
    });

    await expect(service.uploadCertificate(employee.id, 'react', {} as Express.Multer.File)).rejects.toThrow(
      'database unavailable',
    );
    expect(certificateStorage.remove).toHaveBeenCalledWith('new.pdf');
  });

  it('does not remove a certificate when an employee competency assignment is missing', async () => {
    employeesRepository.findOne.mockResolvedValue(employee);
    assignmentsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.unassignCompetency(employee.id, 'react')).rejects.toBeInstanceOf(NotFoundException);
    expect(certificateStorage.remove).not.toHaveBeenCalled();
  });

  it('removes an existing competency assignment and its certificate', async () => {
    employeesRepository.findOne.mockResolvedValue(employee);
    const assignment = { employeeId: employee.id, competencyId: 'react', certificateStoredName: 'react.pdf' };
    assignmentsRepository.findOneBy.mockResolvedValue(assignment);

    await service.unassignCompetency(employee.id, 'react');
    expect(assignmentsRepository.remove).toHaveBeenCalledWith(assignment);
    expect(certificateStorage.remove).toHaveBeenCalledWith('react.pdf');
  });

  it('downloads certificate metadata only when a complete certificate is present', async () => {
    employeesRepository.findOne.mockResolvedValue(employee);
    assignmentsRepository.findOneBy.mockResolvedValue({
      certificateStoredName: 'stored.pdf', certificateOriginalName: 'original.pdf',
      certificateMimeType: 'application/pdf', certificateSize: 100,
    });
    const stream = {} as never;
    certificateStorage.open.mockReturnValue(stream);

    await expect(service.downloadCertificate(employee.id, 'react')).resolves.toEqual({
      stream, originalName: 'original.pdf', mimeType: 'application/pdf', size: 100,
    });
    assignmentsRepository.findOneBy.mockResolvedValue({ certificateStoredName: null });
    await expect(service.downloadCertificate(employee.id, 'react')).rejects.toBeInstanceOf(NotFoundException);
  });
});
