import { getTenantSql, json, error, corsPreflight } from '../../_lib/db';
import { requireAuth } from '../../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId! && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(req.url);
    // Parse ID from path: /api/endpoints/:id/threats
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('endpoints') + 1];

    if (!id) return error('Endpoint ID is required', 400);

    const resolvedParam = url.searchParams.get('resolved');
    const tenantId = auth.tenantId!;
    const sql = await getTenantSql(tenantId);

    // Verify the endpoint belongs to this tenant
    const [ep] = await sql`SELECT id FROM endpoints WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
    if (!ep) return error('Endpoint not found', 404);

    let threats;
    if (resolvedParam === 'false') {
      threats = await sql`
        SELECT id, threat_type, severity, description, detected_at, resolved
        FROM endpoint_threats
        WHERE endpoint_id = ${id} AND resolved = FALSE
        ORDER BY detected_at DESC
      `;
    } else {
      threats = await sql`
        SELECT id, threat_type, severity, description, detected_at, resolved
        FROM endpoint_threats
        WHERE endpoint_id = ${id}
        ORDER BY detected_at DESC
      `;
    }

    return json({ threats });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to fetch threats', 500);
  }
}
