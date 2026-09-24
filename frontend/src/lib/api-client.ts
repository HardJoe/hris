import type { ApiEnvelope, ApiErrorEnvelope } from './contracts';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function errorMessage(payload: ApiErrorEnvelope | null): string {
  const message = payload?.error?.message;
  return Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong.');
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/hris${path}`, {
    ...init,
    headers: init?.body instanceof FormData
      ? init.headers
      : { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (response.status === 401) {
    // A full navigation is intentional: it also discards any authenticated client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login?expired=1');
    throw new ApiClientError('Your session has expired.', 401);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
    throw new ApiClientError(errorMessage(payload), response.status);
  }

  if (response.status === 204) return undefined as T;
  return ((await response.json()) as ApiEnvelope<T>).data;
}

export async function downloadFile(path: string): Promise<void> {
  const response = await fetch(`/api/hris${path}`, { cache: 'no-store' });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
    throw new ApiClientError(errorMessage(payload), response.status);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  anchor.download = encodedName ? decodeURIComponent(encodedName) : 'certificate';
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}
