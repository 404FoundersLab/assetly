import { json, error, corsPreflight } from '../_lib/db';
import { readCookie } from '../_lib/auth';
import { REFRESH_COOKIE, clearedCookies, revokeByToken } from '../_lib/session';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);
  const refresh = readCookie(req, REFRESH_COOKIE);
  if (refresh) await revokeByToken(refresh);
  return json({ ok: true }, 200, { cookies: clearedCookies() });
}
