'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { ApiErrorEnvelope } from '@/lib/contracts';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    }).catch(() => null);
    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as ApiErrorEnvelope | null;
      const message = payload?.error.message;
      setError(Array.isArray(message) ? message.join('. ') : (message ?? 'Unable to sign in.'));
      setPending(false);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      {searchParams.get('expired') && !error ? (
        <div className="notice notice-error" role="alert">Your session expired. Please sign in again.</div>
      ) : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      <div className="field mb-4">
        <label className="label" htmlFor="email">Email address</label>
        <input className="input" id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder="admin@example.com" />
      </div>
      <div className="field mb-[22px]">
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="button button-primary w-full" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
