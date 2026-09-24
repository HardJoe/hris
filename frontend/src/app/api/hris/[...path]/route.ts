import { cookies } from 'next/headers';
import { getAccessToken, SESSION_COOKIE } from '@/lib/session';
import { getApiUrl, jsonError, readUpstreamResponse } from '@/lib/server-api';
import { isTrustedMutationRequest } from '@/lib/security';

const UUID = '[0-9a-fA-F-]{36}';
const ROUTES: Array<{ pattern: RegExp; methods: ReadonlySet<string> }> = [
  { pattern: /^employees$/, methods: new Set(['GET', 'POST']) },
  { pattern: new RegExp(`^employees/${UUID}$`), methods: new Set(['GET', 'PATCH', 'DELETE']) },
  {
    pattern: new RegExp(`^employees/${UUID}/competencies/${UUID}$`),
    methods: new Set(['PUT', 'DELETE']),
  },
  {
    pattern: new RegExp(`^employees/${UUID}/competencies/${UUID}/certificate$`),
    methods: new Set(['GET', 'POST']),
  },
  { pattern: /^competencies$/, methods: new Set(['GET', 'POST']) },
  { pattern: new RegExp(`^competencies/${UUID}$`), methods: new Set(['GET', 'PATCH', 'DELETE']) },
  { pattern: /^dashboard\/summary$/, methods: new Set(['GET']) },
];

function isAllowed(path: string, method: string): boolean {
  return ROUTES.some((route) => route.pattern.test(path) && route.methods.has(method));
}

async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const path = (await context.params).path.join('/');
  if (!isAllowed(path, request.method)) return jsonError('Route not found.', 404);
  if (!isTrustedMutationRequest(request)) return jsonError('Invalid request origin.', 403);

  const token = await getAccessToken();
  if (!token) return jsonError('Authentication is required.', 401);

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 6 * 1024 * 1024) return jsonError('Request is too large.', 413);

  const target = getApiUrl(path);
  target.search = new URL(request.url).search;
  const headers = new Headers({ authorization: `Bearer ${token}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  try {
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 6 * 1024 * 1024) return jsonError('Request is too large.', 413);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
    const response = await readUpstreamResponse(upstream);
    if (upstream.status === 401) (await cookies()).delete(SESSION_COOKIE);
    return response;
  } catch {
    return jsonError('The HRIS service is currently unavailable.', 503);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
