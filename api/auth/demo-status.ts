import { json, corsPreflight } from '../_lib/db';
import { isDemoAuthEnabled } from '../_lib/security';

export const config = { runtime: 'edge' };

/** Public flag so the login UI can show Try Demo only when demo auth is enabled. */
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  return json({ enabled: isDemoAuthEnabled() });
}
