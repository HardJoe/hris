import { cookies } from 'next/headers';
import { jsonError } from '@/lib/server-api';
import { isTrustedMutationRequest } from '@/lib/security';
import { SESSION_COOKIE } from '@/lib/session';

export async function POST(request: Request): Promise<Response> {
  if (!isTrustedMutationRequest(request)) return jsonError('Invalid request origin.', 403);
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
