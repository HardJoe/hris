import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard-view';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <>
      <header className="page-header"><div><h1 className="page-title">Dashboard</h1><p className="page-description">A concise view of your current workforce.</p></div></header>
      <DashboardView />
    </>
  );
}
