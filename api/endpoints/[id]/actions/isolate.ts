import { getTenantSql, json, error, corsPreflight } from '../../../_lib/db';
import { requireAuth, canManageEndpoints } from '../../../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (!canManageEndpoints(auth.role)) return error('Forbidden', 403);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('endpoints') + 1];

    if (!id) return error('Endpoint ID is required', 400);

    const tenantId = auth.tenantId!;
    const sql = await getTenantSql(tenantId);

    const [ep] = await sql`SELECT id FROM endpoints WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
    if (!ep) return error('Endpoint not found', 404);

    const result = await sql`
      INSERT INTO endpoint_commands (endpoint_id, command, status)
      VALUES (${id}, 'isolate', 'pending')
      RETURNING id, created_at
    ` as { id: number; created_at: string }[];
    const inserted = result[0];

    return json({
      job_id: inserted.id,
      status: 'queued',
      isolation_status: 'isolated',
      isolated_at: inserted.created_at,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to isolate device', 500);
  }
}
