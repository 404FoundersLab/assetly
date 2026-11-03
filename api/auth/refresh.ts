import { json, error, corsPreflight } from '../_lib/db';
import { rotateRefreshToken } from '../_lib/session';
import { consume, tooManyRequests } from '../_lib/ratelimit';
import { clientIp } from '../_lib/security';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);
  try {
    const limit = await consume(`refresh:${clientIp(req)}`, 30, 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSec);
    return await rotateRefreshToken(req);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Refresh failed', 500);
  }
}

export { json };
