import { getTenantSql, json, error, corsPreflight } from '../../_lib/db';
import { requireAuth } from '../../_lib/auth';
import { evaluateAppCves } from '../../_lib/cve';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId! && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('endpoints') + 1];

    if (!id) return error('Endpoint ID is required', 400);

    const vulnerableParam = url.searchParams.get('vulnerable');
    const tenantId = auth.tenantId!;
    const sql = await getTenantSql(tenantId);

    // Verify the endpoint belongs to this tenant
    const [ep] = await sql`SELECT id FROM endpoints WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
    if (!ep) return error('Endpoint not found', 404);

    const rawApps = await sql`
      SELECT id, app_name, version, publisher, install_date, cve_count, cve_ids
      FROM endpoint_installed_apps
      WHERE endpoint_id = ${id}
      ORDER BY app_name ASC
    ` as any[];

    // Dynamically enrich apps with CVE engine results
    const apps = rawApps.map(app => {
      const evalResult = evaluateAppCves(app.app_name, app.version);
      const cve_count = Math.max(app.cve_count || 0, evalResult.cve_count);
      const cve_ids = Array.from(new Set([...(app.cve_ids || []), ...evalResult.cve_ids]));
      return {
        ...app,
        cve_count,
        cve_ids,
        cve_details: evalResult.details,
      };
    });

    const filtered = vulnerableParam === 'true' ? apps.filter(a => a.cve_count > 0) : apps;

    return json({ apps: filtered });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to fetch installed apps', 500);
  }
}
