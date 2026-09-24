import { EmploymentStatus } from '../../common/enums/employment-status.enum';
import { Gender } from '../../common/enums/gender.enum';
import { Grade } from '../../common/enums/grade.enum';
import { Position } from '../../common/enums/position.enum';

export interface EmployeeCompetencyView {
  id: string;
  name: string;
  grade: Grade;
  certificate: {
    available: boolean;
    originalName: string | null;
    mimeType: string | null;
    size: number | null;
  };
}

export interface EmployeeView {
  id: string;
  name: string;
  gender: Gender;
  dateOfBirth: string;
  email: string;
  position: Position;
  status: EmploymentStatus;
  hiredAt: string;
  competencies: EmployeeCompetencyView[];
  createdAt: Date;
  updatedAt: Date;
}
