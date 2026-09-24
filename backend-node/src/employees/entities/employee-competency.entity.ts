import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Competency } from '../../competencies/entities/competency.entity';
import { Employee } from './employee.entity';

@Entity({ name: 'employee_competencies' })
export class EmployeeCompetency {
  @PrimaryColumn({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @PrimaryColumn({ name: 'competency_id', type: 'uuid' })
  competencyId: string;

  @ManyToOne(() => Employee, (employee) => employee.competencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Competency, (competency) => competency.employeeAssignments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'competency_id' })
  competency: Competency;

  @Column({ name: 'certificate_stored_name', type: 'varchar', length: 255, nullable: true })
  certificateStoredName: string | null;

  @Column({ name: 'certificate_original_name', type: 'varchar', length: 255, nullable: true })
  certificateOriginalName: string | null;

  @Column({ name: 'certificate_mime_type', type: 'varchar', length: 100, nullable: true })
  certificateMimeType: string | null;

  @Column({ name: 'certificate_size', type: 'integer', nullable: true })
  certificateSize: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
