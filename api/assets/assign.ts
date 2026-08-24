import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapAsset, type DbAsset } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseBody<{
      assetId?: string;
      employeeId?: string;
      assignedBy?: string;
      notes?: string;
      audit?: Record<string, string>;
    }>(req);

    const assetId = String(body.assetId ?? '');
    const employeeId = String(body.employeeId ?? '');
    const assignedBy = String(body.assignedBy ?? `${auth.firstName} ${auth.lastName}`);

    if (!assetId || !employeeId) return error('assetId and employeeId are required', 400);

    const sql = await getTenantSql(auth.tenantId!);

    const existing = await sql`
      SELECT id FROM assets WHERE id = ${assetId} AND tenant_id = ${auth.tenantId!}
    ` as { id: string }[];
    if (existing.length === 0) return error('Asset not found', 404);

    await sql`
      UPDATE asset_assignments SET returned_at = NOW()
      WHERE asset_id = ${assetId} AND tenant_id = ${auth.tenantId!} AND returned_at IS NULL
    `;

    await sql`
      INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
      VALUES (
        ${auth.tenantId!}, ${assetId}, ${employeeId}, ${assignedBy},
        ${body.notes ? String(body.notes) : null}
      )
    `;

    await sql`
      UPDATE assets SET
        status = 'deployed',
        assigned_employee_id = ${employeeId},
        updated_at = NOW()
      WHERE id = ${assetId} AND tenant_id = ${auth.tenantId!}
    `;

    await sql`
      INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
      VALUES (
        ${auth.tenantId!}, ${assetId}, 'ASSIGNED', 'Asset assigned to employee', ${assignedBy}
      )
    `;

    const audit = body.audit;
    await insertAuditLog({
      userId: audit?.userId ?? auth.sub,
      userName: audit?.userName ?? assignedBy,
      action: 'ASSIGN',
      entityType: 'asset',
      entityId: assetId,
      entityLabel: audit?.entityLabel ?? assetId,
      details: audit?.details ?? 'Asset assigned to employee',
    });

    const rows = await sql`
      SELECT * FROM assets WHERE id = ${assetId} AND tenant_id = ${auth.tenantId!}
    ` as DbAsset[];
    return json(mapAsset(rows[0]));
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Assign failed', 500);
  }
}
