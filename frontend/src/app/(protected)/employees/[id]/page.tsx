import type { Metadata } from 'next';
import { EmployeeDetail, EmployeeDetailActions } from '@/components/employee-detail';

export const metadata: Metadata = { title: 'Employee details' };
export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><header className="page-header"><div><h1 className="page-title">Employee details</h1><p className="page-description">Profile, employment, competencies, and certificates.</p></div><EmployeeDetailActions employeeId={id} /></header><EmployeeDetail employeeId={id} /></>;
}
