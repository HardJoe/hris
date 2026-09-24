import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ReadStream } from 'fs';
import { Competency } from '../competencies/entities/competency.entity';
import { Grade } from '../common/enums/grade.enum';
import { PagedResult } from '../common/interfaces/paged-result.interface';
import { CertificateStorageService } from './certificate-storage.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeCompetencyDto } from './dto/employee-competency.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeCompetency } from './entities/employee-competency.entity';
import { Employee } from './entities/employee.entity';
import { EmployeeView } from './interfaces/employee-view.interface';

export interface CertificateDownload {
  stream: ReadStream;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(EmployeeCompetency)
    private readonly assignmentsRepository: Repository<EmployeeCompetency>,
    @InjectRepository(Competency)
    private readonly competenciesRepository: Repository<Competency>,
    private readonly dataSource: DataSource,
    private readonly certificateStorage: CertificateStorageService,
  ) {}

  async create(input: CreateEmployeeDto): Promise<EmployeeView> {
    this.validateDates(input.dateOfBirth, input.hiredAt);
    const { competencies = [], ...employeeInput } = input;

    const employeeId = await this.dataSource.transaction(async (manager) => {
      this.assertUniqueCompetencyAssignments(competencies);
      await this.assertCompetenciesExist(
        competencies.map((assignment) => assignment.competencyId),
        manager.getRepository(Competency),
      );
      const employee = await manager
        .getRepository(Employee)
        .save(manager.getRepository(Employee).create(employeeInput));
      if (competencies.length > 0) {
        await manager
          .getRepository(EmployeeCompetency)
          .insert(
            competencies.map(({ competencyId, grade }) => ({
              employeeId: employee.id,
              competencyId,
              grade,
            })),
          );
      }
      return employee.id;
    });

    return this.findOne(employeeId);
  }

  async findAll(query: EmployeeQueryDto): Promise<PagedResult<EmployeeView>> {
    const builder = this.employeesRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.competencies', 'assignment')
      .leftJoinAndSelect('assignment.competency', 'competency')
      .orderBy('employee.name', 'ASC')
      .addOrderBy('competency.name', 'ASC');

    if (query.search) {
      builder.andWhere('(employee.name ILIKE :search OR employee.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.position)
      builder.andWhere('employee.position = :position', { position: query.position });
    if (query.status) builder.andWhere('employee.status = :status', { status: query.status });
    if (query.competencyId) {
      builder.andWhere(
        `EXISTS (
          SELECT 1 FROM employee_competencies filter_assignment
          WHERE filter_assignment.employee_id = employee.id
            AND filter_assignment.competency_id = :competencyId
        )`,
        { competencyId: query.competencyId },
      );
    }

    const [items, totalItems] = await builder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: items.map((employee) => this.toView(employee)),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<EmployeeView> {
    return this.toView(await this.getEntity(id));
  }

  async update(id: string, input: UpdateEmployeeDto): Promise<EmployeeView> {
    if (input.dateOfBirth || input.hiredAt) {
      const existing = await this.getEntity(id);
      this.validateDates(
        input.dateOfBirth ?? existing.dateOfBirth,
        input.hiredAt ?? existing.hiredAt,
      );
    }

    const { competencies, ...employeeInput } = input;
    const filesToRemove = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Employee);
      const employee = await repository.findOneBy({ id });
      if (!employee) throw new NotFoundException('Employee not found');

      repository.merge(employee, employeeInput);
      await repository.save(employee);

      if (!competencies) return [];
      this.assertUniqueCompetencyAssignments(competencies);
      await this.assertCompetenciesExist(
        competencies.map((assignment) => assignment.competencyId),
        manager.getRepository(Competency),
      );
      const assignmentRepository = manager.getRepository(EmployeeCompetency);
      const existing = await assignmentRepository.findBy({ employeeId: id });
      const retained = new Set(competencies.map((assignment) => assignment.competencyId));
      const removed = existing.filter((item) => !retained.has(item.competencyId));
      if (removed.length > 0) await assignmentRepository.remove(removed);
      const currentIds = new Set(existing.map((item) => item.competencyId));
      const added = competencies.filter((assignment) => !currentIds.has(assignment.competencyId));
      if (added.length > 0) {
        await assignmentRepository.insert(
          added.map(({ competencyId, grade }) => ({ employeeId: id, competencyId, grade })),
        );
      }
      for (const { competencyId, grade } of competencies) {
        if (currentIds.has(competencyId)) {
          await assignmentRepository.update({ employeeId: id, competencyId }, { grade });
        }
      }
      return removed
        .map((item) => item.certificateStoredName)
        .filter((name): name is string => !!name);
    });

    await Promise.all(filesToRemove.map((name) => this.certificateStorage.remove(name)));
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const filesToRemove = await this.dataSource.transaction(async (manager) => {
      const employeeRepository = manager.getRepository(Employee);
      const employee = await employeeRepository.findOneBy({ id });
      if (!employee) throw new NotFoundException('Employee not found');
      const assignmentRepository = manager.getRepository(EmployeeCompetency);
      const assignments = await assignmentRepository.findBy({ employeeId: id });
      await assignmentRepository.remove(assignments);
      await employeeRepository.softRemove(employee);
      return assignments
        .map((item) => item.certificateStoredName)
        .filter((name): name is string => !!name);
    });
    await Promise.all(filesToRemove.map((name) => this.certificateStorage.remove(name)));
  }

  async assignCompetency(
    employeeId: string,
    competencyId: string,
    grade: Grade,
  ): Promise<EmployeeView> {
    await this.getEntity(employeeId);
    await this.assertCompetenciesExist([competencyId], this.competenciesRepository);
    await this.assignmentsRepository.upsert({ employeeId, competencyId, grade }, [
      'employeeId',
      'competencyId',
    ]);
    return this.findOne(employeeId);
  }

  async unassignCompetency(employeeId: string, competencyId: string): Promise<void> {
    await this.getEntity(employeeId);
    const assignment = await this.assignmentsRepository.findOneBy({ employeeId, competencyId });
    if (!assignment) throw new NotFoundException('Employee competency assignment not found');
    await this.assignmentsRepository.remove(assignment);
    await this.certificateStorage.remove(assignment.certificateStoredName);
  }

  async uploadCertificate(
    employeeId: string,
    competencyId: string,
    file: Express.Multer.File,
  ): Promise<EmployeeView> {
    await this.getEntity(employeeId);
    await this.assertCompetenciesExist([competencyId], this.competenciesRepository);
    const assignment = await this.assignmentsRepository.findOneBy({ employeeId, competencyId });
    if (!assignment) throw new NotFoundException('Employee competency assignment not found');
    const stored = await this.certificateStorage.store(file);
    const previousStoredName = assignment.certificateStoredName;

    try {
      Object.assign(assignment, {
        certificateStoredName: stored.storedName,
        certificateOriginalName: stored.originalName,
        certificateMimeType: stored.mimeType,
        certificateSize: stored.size,
      });
      await this.assignmentsRepository.save(assignment);
    } catch (error: unknown) {
      await this.certificateStorage.remove(stored.storedName);
      throw error;
    }

    await this.certificateStorage.remove(previousStoredName);
    return this.findOne(employeeId);
  }

  async downloadCertificate(
    employeeId: string,
    competencyId: string,
  ): Promise<CertificateDownload> {
    await this.getEntity(employeeId);
    const assignment = await this.assignmentsRepository.findOneBy({ employeeId, competencyId });
    if (
      !assignment?.certificateStoredName ||
      !assignment.certificateOriginalName ||
      !assignment.certificateMimeType ||
      assignment.certificateSize === null
    ) {
      throw new NotFoundException('Certificate not found');
    }
    return {
      stream: this.certificateStorage.open(assignment.certificateStoredName),
      originalName: assignment.certificateOriginalName,
      mimeType: assignment.certificateMimeType,
      size: assignment.certificateSize,
    };
  }

  private async getEntity(id: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
      relations: { competencies: { competency: true } },
      order: { competencies: { competency: { name: 'ASC' } } },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async assertCompetenciesExist(
    competencyIds: string[],
    repository: Repository<Competency>,
  ): Promise<void> {
    if (competencyIds.length === 0) return;
    const count = await repository.countBy({ id: In(competencyIds) });
    if (count !== competencyIds.length)
      throw new BadRequestException('One or more competencies do not exist');
  }

  private assertUniqueCompetencyAssignments(competencies: EmployeeCompetencyDto[]): void {
    const competencyIds = competencies.map((assignment) => assignment.competencyId);
    if (new Set(competencyIds).size !== competencyIds.length) {
      throw new BadRequestException('Each competency can only be assigned once');
    }
  }

  private validateDates(dateOfBirth: string, hiredAt: string): void {
    const today = new Date().toISOString().slice(0, 10);
    if (dateOfBirth >= today) throw new BadRequestException('dateOfBirth must be in the past');
    if (hiredAt > today) throw new BadRequestException('hiredAt cannot be in the future');
    if (dateOfBirth >= hiredAt) throw new BadRequestException('dateOfBirth must be before hiredAt');
  }

  private toView(employee: Employee): EmployeeView {
    return {
      id: employee.id,
      name: employee.name,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth,
      email: employee.email,
      position: employee.position,
      status: employee.status,
      hiredAt: employee.hiredAt,
      competencies: (employee.competencies ?? []).map((assignment) => ({
        id: assignment.competency.id,
        name: assignment.competency.name,
        grade: assignment.grade,
        certificate: {
          available: !!assignment.certificateStoredName,
          originalName: assignment.certificateOriginalName,
          mimeType: assignment.certificateMimeType,
          size: assignment.certificateSize,
        },
      })),
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
