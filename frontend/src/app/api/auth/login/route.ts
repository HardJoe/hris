import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ApiEnvelope, ApiErrorEnvelope } from '@/lib/contracts';
import { getApiUrl, jsonError } from '@/lib/server-api';
import { isTrustedMutationRequest, parseDurationSeconds } from '@/lib/security';
import { SESSION_COOKIE } from '@/lib/session';

interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedMutationRequest(request)) return jsonError('Invalid request origin.', 403);
  if (Number(request.headers.get('content-length') ?? 0) > 8_192) {
    return jsonError('Request is too large.', 413);
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (
    !body ||
    typeof body.email !== 'string' ||
    !/^\S+@\S+\.\S+$/.test(body.email) ||
    typeof body.password !== 'string' ||
    body.password.length < 1 ||
    body.password.length > 256
  ) {
    return jsonError('Enter a valid email address and password.', 400);
  }

  try {
    const upstream = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email.trim(), password: body.password }),
      cache: 'no-store',
    });
    const payload = (await upstream.json().catch(() => null)) as
      | ApiEnvelope<LoginResult>
      | ApiErrorEnvelope
      | null;
    if (!upstream.ok || !payload || !('data' in payload)) {
      const message = payload && 'error' in payload ? payload.error.message : 'Unable to sign in.';
      return NextResponse.json(
        { error: { statusCode: upstream.status, code: 'LoginFailed', message } },
        { status: upstream.status, headers: { 'cache-control': 'no-store' } },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, payload.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: parseDurationSeconds(payload.data.expiresIn),
    });
    return NextResponse.json({ data: { authenticated: true } });
  } catch {
    return jsonError('The HRIS service is currently unavailable.', 503);
  }
}
