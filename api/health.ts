import { getSql, json, error, corsPreflight } from './_lib/db';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return json({ status: 'ok', database: 'connected' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database connection failed';
    return json({ status: 'error', database: 'disconnected', message }, 503);
  }
}
