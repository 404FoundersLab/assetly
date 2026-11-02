import { corsPreflight, error, getTenantSql, json } from '../_lib/db';
import { requireAuth } from '../_lib/auth';
import { getMyRequests } from '../_lib/workflow-engine';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'GET') {
      const items = await getMyRequests(sql, {
        tenantId: auth.tenantId!,
        userId: auth.sub,
        employeeId: auth.employeeId,
      });

      return json(items);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch user requests';
    return error(msg, 500);
  }
}

