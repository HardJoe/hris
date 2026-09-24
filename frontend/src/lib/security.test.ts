import { describe, expect, it } from 'vitest';
import { isTrustedMutationRequest, parseDurationSeconds } from './security';

describe('request security', () => {
  it('allows safe methods without an origin', () => {
    expect(isTrustedMutationRequest(new Request('https://hris.example.test/api', { method: 'GET' }))).toBe(true);
  });

  it('allows same-origin mutations', () => {
    const request = new Request('https://hris.example.test/api', {
      method: 'POST',
      headers: { origin: 'https://hris.example.test' },
    });
    expect(isTrustedMutationRequest(request)).toBe(true);
  });

  it('rejects cross-origin and originless browser mutations', () => {
    expect(isTrustedMutationRequest(new Request('https://hris.example.test/api', {
      method: 'DELETE',
      headers: { origin: 'https://malicious.example' },
    }))).toBe(false);
    expect(isTrustedMutationRequest(new Request('https://hris.example.test/api', {
      method: 'PATCH',
      headers: { 'sec-fetch-site': 'cross-site' },
    }))).toBe(false);
  });
});

describe('session duration parsing', () => {
  it('converts supported duration units', () => {
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('2h')).toBe(7200);
  });

  it('uses a safe fallback and caps long sessions', () => {
    expect(parseDurationSeconds('invalid')).toBe(900);
    expect(parseDurationSeconds('30d')).toBe(86_400);
  });
});
