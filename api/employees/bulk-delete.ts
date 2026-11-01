import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST' && req.method !== 'DELETE') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  try {
    const body = await parseBody<{ ids?: string[]; all?: boolean }>(req);
    const sql = await getTenantSql(auth.tenantId!);

    if (body.all === true) {
      // Unlink all assets in tenant
      await sql`UPDATE assets SET assigned_employee_id = NULL WHERE tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM asset_assignments WHERE tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM employees WHERE tenant_id = ${auth.tenantId!}`;

      // Purge corresponding employee user records and passwords
      await sql`
        DELETE FROM user_passwords WHERE user_id IN (
          SELECT id FROM users WHERE tenant_id = ${auth.tenantId!} AND role = 'employee'
        )
      `;
      await sql`DELETE FROM users WHERE tenant_id = ${auth.tenantId!} AND role = 'employee'`;

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'employee',
        entityId: 'all-employees',
        entityLabel: 'All Employees',
        details: 'Deleted all employees for tenant',
      });

      return json({ success: true, count: 'all' });
    }

    const rawIds = Array.isArray(body?.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (rawIds.length === 0) return error('No employee IDs provided', 400);

    const targetUuids = rawIds.filter(isUuid);
    const nonUuids = rawIds.filter((id) => !isUuid(id));

    if (nonUuids.length > 0) {
      const numberMatches = (await sql`
        SELECT id FROM employees
        WHERE tenant_id = ${auth.tenantId!} AND employee_number = ANY(${nonUuids}::varchar[])
      `) as { id: string }[];
      numberMatches.forEach((row) => {
        if (!targetUuids.includes(row.id)) targetUuids.push(row.id);
      });
    }

    if (targetUuids.length === 0) {
      return error('No matching employees found to delete', 404);
    }

    // Unlink any assets assigned to these employees
    await sql`
      UPDATE assets SET assigned_employee_id = NULL
      WHERE tenant_id = ${auth.tenantId!} AND assigned_employee_id = ANY(${targetUuids}::uuid[])
    `;
    await sql`
      DELETE FROM asset_assignments
      WHERE tenant_id = ${auth.tenantId!} AND employee_id = ANY(${targetUuids}::uuid[])
    `;

    // Delete corresponding employee user records
    const empRows = (await sql`
      SELECT email, joining_email, official_email
      FROM employees
      WHERE tenant_id = ${auth.tenantId!} AND id = ANY(${targetUuids}::uuid[])
    `) as { email?: string; joining_email?: string; official_email?: string }[];

    const emails = empRows
      .flatMap((r) => [r.email, r.joining_email, r.official_email])
      .filter(Boolean)
      .map((e) => e!.trim().toLowerCase());

    if (emails.length > 0) {
      try {
        await sql`
          DELETE FROM users
          WHERE tenant_id = ${auth.tenantId!}
            AND role = 'employee'
            AND LOWER(email) = ANY(${emails}::text[])
        `;
      } catch {}
      try {
        await sql`
          DELETE FROM user_passwords
          WHERE LOWER(email) = ANY(${emails}::text[])
        `;
      } catch {}
    }

    const deleted = (await sql`
      DELETE FROM employees
      WHERE tenant_id = ${auth.tenantId!} AND id = ANY(${targetUuids}::uuid[])
      RETURNING id, employee_number, first_name, last_name
    `) as { id: string; employee_number: string; first_name: string; last_name: string }[];

    await insertAuditLog({
      userId: auth.sub,
      userName: `${auth.firstName} ${auth.lastName}`,
      action: 'DELETE',
      entityType: 'employee',
      entityId: 'bulk-delete',
      entityLabel: `${deleted.length} employees`,
      details: `Bulk deleted ${deleted.length} employee(s)`,
    });

    return json({ success: true, count: deleted.length, deleted });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Bulk delete failed', 500);
  }
}
