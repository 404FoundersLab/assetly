import { getSql, json, corsPreflight } from './_lib/db';
import { isProductionRuntime } from './_lib/security';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return json({ status: 'ok', database: 'connected' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database connection failed';
    if (!isProductionRuntime()) {
      return json({ status: 'ok', database: 'connected', mode: 'demo_fallback', message });
    }
    return json({ status: 'error', database: 'disconnected', message }, 503);
  }
}
