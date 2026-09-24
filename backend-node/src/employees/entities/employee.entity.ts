import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmploymentStatus } from '../../common/enums/employment-status.enum';
import { Gender } from '../../common/enums/gender.enum';
import { Position } from '../../common/enums/position.enum';
import { EmployeeCompetency } from './employee-competency.entity';

@Entity({ name: 'employees' })
@Index('idx_employees_status_position', ['status', 'position'])
@Index('idx_employees_hired_at', ['hiredAt'])
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'enum', enum: Gender, enumName: 'employee_gender' })
  gender: Gender;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ type: 'enum', enum: Position, enumName: 'employee_position' })
  position: Position;

  @Column({
    type: 'enum',
    enum: EmploymentStatus,
    enumName: 'employment_status',
    default: EmploymentStatus.ACTIVE,
  })
  status: EmploymentStatus;

  @Column({ name: 'hired_at', type: 'date' })
  hiredAt: string;

  @OneToMany(() => EmployeeCompetency, (assignment) => assignment.employee, {
    cascade: false,
  })
  competencies: EmployeeCompetency[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
