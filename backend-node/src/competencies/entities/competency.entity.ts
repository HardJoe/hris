import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Grade } from '../../common/enums/grade.enum';
import { EmployeeCompetency } from '../../employees/entities/employee-competency.entity';

@Entity({ name: 'competencies' })
export class Competency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'enum', enum: Grade, enumName: 'competency_grade' })
  grade: Grade;

  @OneToMany(() => EmployeeCompetency, (assignment) => assignment.competency)
  employeeAssignments: EmployeeCompetency[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
