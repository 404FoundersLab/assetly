import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapDepartment, type DbDepartment } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const id = url.pathname.split('/').filter(Boolean).pop();
  if (!id || id === 'departments') return error('Department id required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'PATCH') {
      const body = await parseBody<Record<string, unknown>>(req);
      const rows = await sql`
        UPDATE departments SET
          name = COALESCE(${body.name ? String(body.name) : null}, name),
          cost_center = COALESCE(${body.costCenter != null ? String(body.costCenter) : null}, cost_center)
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbDepartment[];
      if (rows.length === 0) return error('Department not found', 404);

      const dept = mapDepartment(rows[0]);
      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'department',
        entityId: id,
        entityLabel: dept.name,
        details: 'Department updated',
      });
      return json(dept);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM departments WHERE id = ${id} AND tenant_id = ${auth.tenantId!}`;
      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'department',
        entityId: id,
        entityLabel: id,
        details: 'Department deleted',
      });
      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Request failed', 500);
  }
}
