import { getTenantSql, json, error, corsPreflight } from '../../_lib/db';
import { requireAuth, canManageEndpoints } from '../../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET' && req.method !== 'POST') return error('Method not allowed', 405);

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

    const [ep] = await sql`SELECT id FROM endpoints WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
    if (!ep) return error('Endpoint not found', 404);

    // POST = "capture now": queue a command for the agent
    if (req.method === 'POST') {
      const [row] = await sql`
        INSERT INTO endpoint_commands (endpoint_id, command, status)
        VALUES (${id}, 'screenshot', 'pending')
        RETURNING id
      ` as { id: number }[];
      return json({ job_id: row.id, status: 'queued' });
    }

    const screenshots = await sql`
      SELECT id, image_data, captured_at FROM endpoint_screenshots
      WHERE endpoint_id = ${id}
      ORDER BY captured_at DESC
      LIMIT 12
    `;
    return json({ screenshots });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to fetch screenshots', 500);
  }
}

