import type { Metadata } from 'next';
import { EmployeeForm } from '@/components/employee-form';

export const metadata: Metadata = { title: 'Edit employee' };
export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><header className="page-header"><div><h1 className="page-title">Edit employee</h1><p className="page-description">Update profile, employment, and competency information.</p></div></header><EmployeeForm employeeId={id} /></>; }
