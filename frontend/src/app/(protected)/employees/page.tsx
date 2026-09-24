import type { Metadata } from 'next';
import Link from 'next/link';
import { EmployeesView } from '@/components/employees-view';

export const metadata: Metadata = { title: 'Employees' };

export default function EmployeesPage() {
  return (
    <>
      <header className="page-header"><div><h1 className="page-title">Employees</h1><p className="page-description">Manage employee profiles, positions, and competencies.</p></div><Link className="button button-primary" href="/employees/new">+ Add employee</Link></header>
      <EmployeesView />
    </>
  );
}
