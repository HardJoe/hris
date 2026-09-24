import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Competency } from '../competencies/entities/competency.entity';
import { EmployeeCompetency } from '../employees/entities/employee-competency.entity';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { InitialSchema20260923000000 } from './migrations/20260923000000-initial-schema';
import { MoveGradeToEmployeeCompetencies20260924000000 } from './migrations/20260924000000-move-grade-to-employee-competencies';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

export const appDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [User, Competency, Employee, EmployeeCompetency],
  migrations: [InitialSchema20260923000000, MoveGradeToEmployeeCompetencies20260924000000],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
});
