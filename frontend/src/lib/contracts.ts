export const genders = ['MALE', 'FEMALE'] as const;
export const positions = ['JUNIOR_PROGRAMMER', 'MID_PROGRAMMER', 'SENIOR_PROGRAMMER'] as const;
export const employmentStatuses = ['ACTIVE', 'INACTIVE'] as const;
export const grades = ['A', 'B', 'C', 'D'] as const;

export type Gender = (typeof genders)[number];
export type Position = (typeof positions)[number];
export type EmploymentStatus = (typeof employmentStatuses)[number];
export type Grade = (typeof grades)[number];

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: {
    statusCode: number;
    code: string;
    message: string | string[];
    timestamp?: string;
    path?: string;
  };
}

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PagedResult<T> {
  items: T[];
  meta: PageMeta;
}

export interface CertificateInfo {
  available: boolean;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
}

export interface EmployeeCompetency {
  id: string;
  name: string;
  grade: Grade;
  certificate: CertificateInfo;
}

export interface Employee {
  id: string;
  name: string;
  gender: Gender;
  dateOfBirth: string;
  email: string;
  position: Position;
  status: EmploymentStatus;
  hiredAt: string;
  competencies: EmployeeCompetency[];
  createdAt: string;
  updatedAt: string;
}

export interface Competency {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  employeesByPosition: Record<Position, number>;
  employeesByCompetency: Array<{ competencyId: string; name: string; count: number }>;
  newEmployees: { lastOneMonth: number; lastThreeMonths: number };
}

export interface CompetencyAssignmentInput {
  competencyId: string;
  grade: Grade;
}

export interface EmployeeInput {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  email: string;
  position: Position;
  status: EmploymentStatus;
  hiredAt: string;
  competencies: CompetencyAssignmentInput[];
}

export const positionLabels: Record<Position, string> = {
  JUNIOR_PROGRAMMER: 'Junior Programmer',
  MID_PROGRAMMER: 'Mid-level Programmer',
  SENIOR_PROGRAMMER: 'Senior Programmer',
};

export const genderLabels: Record<Gender, string> = { MALE: 'Male', FEMALE: 'Female' };

export const statusLabels: Record<EmploymentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};
