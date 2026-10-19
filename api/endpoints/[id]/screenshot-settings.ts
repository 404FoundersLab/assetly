import { getTenantSql, json, error, corsPreflight, parseBody } from '../../_lib/db';
import { requireAuth, canManageEndpoints } from '../../_lib/auth';

export const config = { runtime: 'edge' };

// 0 = disabled. Allowed intervals (seconds) selectable per device.
const ALLOWED_INTERVALS = [0, 30, 60, 300, 600, 900, 1800, 3600];

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET' && req.method !== 'PUT') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId) return error('Tenant ID is required', 400);
  if (!canManageEndpoints(auth.role)) return error('Forbidden', 403);

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const id = parts[parts.indexOf('endpoints') + 1];
    if (!id) return error('Endpoint ID is required', 400);

    const tenantId = auth.tenantId;
    const sql = await getTenantSql(tenantId);

    const [ep] = await sql`
      SELECT id, screenshot_interval_seconds FROM endpoints
      WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
    `;
    if (!ep) return error('Endpoint not found', 404);

    if (req.method === 'GET') {
      return json({ interval_seconds: ep.screenshot_interval_seconds ?? 0, allowed: ALLOWED_INTERVALS });
    }

    const body = await parseBody<{ interval_seconds?: number }>(req);
    const interval = Number(body.interval_seconds);
    if (!ALLOWED_INTERVALS.includes(interval)) return error('Invalid interval', 400);

    await sql`
      UPDATE endpoints SET screenshot_interval_seconds = ${interval}
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return json({ interval_seconds: interval });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to update screenshot settings', 500);
  }
}

