import { getTenantSql, json, error, corsPreflight } from '../../_lib/db';
import { requireAuth } from '../../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('endpoints') + 1];

    if (!id) return error('Endpoint ID is required', 400);

    const sql = await getTenantSql(auth.tenantId!);
    const result = await sql`
      SELECT last_logged_user, uptime_seconds, last_reboot_at, agent_version, bitlocker_status, bitlocker_drive, serial_number
      FROM endpoints
      WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
    ` as Record<string, unknown>[];

    if (result.length === 0) {
      return error('Endpoint not found', 404);
    }

    return json(result[0]);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to fetch device context', 500);
  }
}
