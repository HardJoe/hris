import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiClientError } from './api-client';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('unwraps successful API envelopes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { count: 4 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(apiRequest<{ count: number }>('/dashboard/summary')).resolves.toEqual({ count: 4 });
    expect(fetch).toHaveBeenCalledWith('/api/hris/dashboard/summary', expect.objectContaining({ cache: 'no-store' }));
  });

  it('normalizes API validation messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { statusCode: 400, code: 'BadRequestException', message: ['name is required', 'email is invalid'] },
    }), { status: 400, headers: { 'content-type': 'application/json' } })));

    await expect(apiRequest('/employees')).rejects.toEqual(
      new ApiClientError('name is required. email is invalid', 400),
    );
  });

  it('supports empty successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest('/employees/id', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
