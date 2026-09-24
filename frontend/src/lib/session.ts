import 'server-only';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'hris_session';

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function hasSession(): Promise<boolean> {
  return Boolean(await getAccessToken());
}
