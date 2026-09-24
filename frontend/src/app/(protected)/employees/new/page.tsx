import type { Metadata } from 'next';
import { EmployeeForm } from '@/components/employee-form';

export const metadata: Metadata = { title: 'Add employee' };
export default function NewEmployeePage() { return <><header className="page-header"><div><h1 className="page-title">Add employee</h1><p className="page-description">Create a profile and assign competencies.</p></div></header><EmployeeForm /></>; }
