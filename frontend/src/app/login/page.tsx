import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { hasSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await hasSession()) redirect('/dashboard');
  return (
    <main className="login-page">
      <section className="login-brand" aria-label="HRIS introduction">
        <div className="brand-mark"><span className="brand-icon">H</span><span>HRIS</span></div>
        <div className="login-copy">
          <h1 className="login-copy-title">People data, made simple.</h1>
          <p className="login-copy-text">Manage your team, skills, and workforce insights in one clear workspace.</p>
        </div>
        <small>Human Resources Information System</small>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <h2 className="login-title">Welcome back</h2>
          <p className="login-subtitle">Sign in to continue to your workspace.</p>
          <Suspense><LoginForm /></Suspense>
        </div>
      </section>
    </main>
  );
}
