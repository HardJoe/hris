import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { hasSession } from '@/lib/session';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect('/login');
  return <AppShell>{children}</AppShell>;
}
