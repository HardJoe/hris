import 'dotenv/config';
import * as argon2 from 'argon2';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Competency } from '../competencies/entities/competency.entity';
import { EmploymentStatus } from '../common/enums/employment-status.enum';
import { Gender } from '../common/enums/gender.enum';
import { Grade } from '../common/enums/grade.enum';
import { Position } from '../common/enums/position.enum';
import { EmployeeCompetency } from '../employees/entities/employee-competency.entity';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { appDataSource } from './data-source';

interface EmployeeSeed {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  email: string;
  position: Position;
  hiredAt: string;
  competencies: Array<{ name: string; grade: Grade }>;
  certificate?: { competencyName: string; storedName: string; originalName: string };
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function seed(): Promise<void> {
  await appDataSource.initialize();
  try {
    await appDataSource
      .getRepository(Competency)
      .createQueryBuilder()
      .insert()
      .values([{ name: 'Spring Boot' }, { name: 'ReactJS' }, { name: 'Node.js' }])
      .orIgnore()
      .execute();

    const employeeSeeds: EmployeeSeed[] = [
      {
        name: 'Avery Chen',
        gender: Gender.FEMALE,
        dateOfBirth: '1999-04-18',
        email: 'avery.chen@example.com',
        position: Position.JUNIOR_PROGRAMMER,
        hiredAt: dateDaysAgo(14),
        competencies: [
          { name: 'ReactJS', grade: Grade.B },
          { name: 'Node.js', grade: Grade.D },
        ],
      },
      {
        name: 'Mateo Santos',
        gender: Gender.MALE,
        dateOfBirth: '1993-08-27',
        email: 'mateo.santos@example.com',
        position: Position.MID_PROGRAMMER,
        hiredAt: dateDaysAgo(45),
        competencies: [
          { name: 'Spring Boot', grade: Grade.B },
          { name: 'ReactJS', grade: Grade.A },
        ],
      },
      {
        name: 'Priya Nair',
        gender: Gender.FEMALE,
        dateOfBirth: '1988-11-09',
        email: 'priya.nair@example.com',
        position: Position.SENIOR_PROGRAMMER,
        hiredAt: dateDaysAgo(80),
        competencies: [
          { name: 'Spring Boot', grade: Grade.A },
          { name: 'Node.js', grade: Grade.A },
        ],
        certificate: {
          competencyName: 'Spring Boot',
          storedName: 'seed-priya-nair-spring-boot.pdf',
          originalName: 'priya-nair-spring-boot-certificate.pdf',
        },
      },
      {
        name: 'Jordan Lee',
        gender: Gender.MALE,
        dateOfBirth: '2000-02-14',
        email: 'jordan.lee@example.com',
        position: Position.JUNIOR_PROGRAMMER,
        hiredAt: dateDaysAgo(140),
        competencies: [{ name: 'Node.js', grade: Grade.B }],
      },
      {
        name: 'Sofia Kim',
        gender: Gender.FEMALE,
        dateOfBirth: '1995-06-03',
        email: 'sofia.kim@example.com',
        position: Position.MID_PROGRAMMER,
        hiredAt: dateDaysAgo(200),
        competencies: [
          { name: 'ReactJS', grade: Grade.B },
          { name: 'Spring Boot', grade: Grade.C },
        ],
      },
      {
        name: 'Daniel Brooks',
        gender: Gender.MALE,
        dateOfBirth: '1987-01-22',
        email: 'daniel.brooks@example.com',
        position: Position.SENIOR_PROGRAMMER,
        hiredAt: dateDaysAgo(330),
        competencies: [
          { name: 'Node.js', grade: Grade.A },
          { name: 'Spring Boot', grade: Grade.A },
        ],
      },
    ];

    await appDataSource.transaction(async (manager) => {
      const competencies = await manager.getRepository(Competency).find();
      const competencyIdsByName = new Map(
        competencies.map((competency) => [competency.name, competency.id]),
      );
      const employees = manager.getRepository(Employee);
      const assignments = manager.getRepository(EmployeeCompetency);

      for (const seedEmployee of employeeSeeds) {
        const existing = await employees.findOneBy({ email: seedEmployee.email });
        const employee =
          existing ??
          (await employees.save(
            employees.create({
              name: seedEmployee.name,
              gender: seedEmployee.gender,
              dateOfBirth: seedEmployee.dateOfBirth,
              email: seedEmployee.email,
              position: seedEmployee.position,
              status: EmploymentStatus.ACTIVE,
              hiredAt: seedEmployee.hiredAt,
            }),
          ));
        await assignments.upsert(
          seedEmployee.competencies.map(({ name, grade }) => {
            const competencyId = competencyIdsByName.get(name);
            if (!competencyId) throw new Error(`Seed competency not found: ${name}`);
            return { employeeId: employee.id, competencyId, grade };
          }),
          ['employeeId', 'competencyId'],
        );
      }
    });

    const uploadDirectory = resolve(process.env.UPLOAD_DIR ?? './uploads');
    const employees = appDataSource.getRepository(Employee);
    const competencies = appDataSource.getRepository(Competency);
    const assignments = appDataSource.getRepository(EmployeeCompetency);
    for (const seedEmployee of employeeSeeds) {
      if (!seedEmployee.certificate) continue;
      const employee = await employees.findOneByOrFail({ email: seedEmployee.email });
      const competency = await competencies.findOneByOrFail({
        name: seedEmployee.certificate.competencyName,
      });
      const assignment = await assignments.findOneByOrFail({
        employeeId: employee.id,
        competencyId: competency.id,
      });
      if (assignment.certificateStoredName) continue;

      await mkdir(uploadDirectory, { recursive: true, mode: 0o750 });
      const certificatePath = resolve(uploadDirectory, seedEmployee.certificate.storedName);
      await writeFile(certificatePath, '%PDF-1.4\n% HRIS seed certificate\n%%EOF\n', {
        mode: 0o640,
      });
      await assignments.update(
        { employeeId: employee.id, competencyId: competency.id },
        {
          certificateStoredName: seedEmployee.certificate.storedName,
          certificateOriginalName: seedEmployee.certificate.originalName,
          certificateMimeType: 'application/pdf',
          certificateSize: 39,
        },
      );
    }

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!email || !password) {
      console.info('Admin seed skipped: bootstrap credentials are not configured');
      return;
    }
    if (password.length < 12)
      throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters');

    const users = appDataSource.getRepository(User);
    const existing = await users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    if (!existing) {
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
      await users.save(users.create({ email, passwordHash, isActive: true }));
      console.info('Bootstrap administrator created');
    } else {
      console.info('Bootstrap administrator already exists');
    }
  } finally {
    await appDataSource.destroy();
  }
}

void seed();
