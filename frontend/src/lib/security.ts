const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isTrustedMutationRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get('origin');
  if (origin) return origin === new URL(request.url).origin;

  return request.headers.get('sec-fetch-site') === 'same-origin';
}

export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 15 * 60;
  const amount = Number(match[1]);
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return Math.min(amount * units[match[2]], 24 * 60 * 60);
}
