import { corsPreflight, error, getTenantSql, json } from '../_lib/db';
import { requireAuth } from '../_lib/auth';
import { getPendingApprovals } from '../_lib/workflow-engine';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'GET') {
      const items = await getPendingApprovals(sql, {
        tenantId: auth.tenantId!,
        actor: auth,
        actorEmployeeId: auth.employeeId,
      });

      return json(items);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch pending approvals';
    return error(msg, 500);
  }
}

