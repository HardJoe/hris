import 'server-only';

const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

export function getApiUrl(path: string): URL {
  const base = process.env.HRIS_API_URL ?? DEFAULT_API_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase);
}

export async function readUpstreamResponse(response: Response): Promise<Response> {
  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  const disposition = response.headers.get('content-disposition');
  if (contentType) headers.set('content-type', contentType);
  if (disposition) headers.set('content-disposition', disposition);
  headers.set('cache-control', 'no-store');

  return new Response(response.body, { status: response.status, headers });
}

export function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: { statusCode: status, code: 'FrontendGatewayError', message } },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}
