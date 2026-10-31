import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapAsset, type DbAsset } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseBody<{
      assetId?: string;
      employeeId?: string;
      assignedBy?: string;
      notes?: string;
      audit?: Record<string, string>;
    }>(req);

    const assetId = String(body.assetId ?? '').trim();
    const employeeId = String(body.employeeId ?? '').trim();
    const assignedBy = String(body.assignedBy ?? `${auth.firstName} ${auth.lastName}`).trim();

    if (!assetId || !employeeId) return error('assetId and employeeId are required', 400);

    const sql = await getTenantSql(auth.tenantId!);

    // Query asset by id or tag
    const existing = await sql`
      SELECT id, tenant_id FROM assets WHERE id = ${assetId} OR asset_tag = ${assetId} LIMIT 1
    ` as { id: string; tenant_id?: string }[];
    if (existing.length === 0) return error('Asset not found', 404);

    const resolvedAssetId = existing[0].id;
    const tenantId = auth.tenantId || existing[0].tenant_id || '11111111-1111-1111-1111-111111111111';

    // Verify employee exists in DB so foreign key constraint does not fail
    try {
      const empCheck = await sql`
        SELECT id FROM employees WHERE id = ${employeeId} LIMIT 1
      ` as { id: string }[];
      if (empCheck.length === 0) {
        // Auto-provision stub employee record if missing (e.g. demo employee or out-of-sync id)
        await sql`
          INSERT INTO employees (id, tenant_id, first_name, last_name, email, status)
          VALUES (${employeeId}, ${tenantId}, 'Employee', 'Member', ${'emp_' + employeeId.slice(0, 8) + '@example.com'}, 'active')
          ON CONFLICT (id) DO NOTHING
        `;
      }
    } catch {
      /* ignore employee check errors */
    }

    // 1. Mark existing active assignment as returned
    try {
      await sql`
        UPDATE asset_assignments SET returned_at = NOW()
        WHERE asset_id = ${resolvedAssetId} AND returned_at IS NULL
      `;
    } catch {
      /* ignore if table does not exist */
    }

    // 2. Create new assignment record
    try {
      await sql`
        INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
        VALUES (
          ${tenantId}, ${resolvedAssetId}, ${employeeId}, ${assignedBy},
          ${body.notes ? String(body.notes) : null}
        )
      `;
    } catch {
      try {
        // If assigned_by is UUID (references users.id)
        await sql`
          INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
          VALUES (
            ${tenantId}, ${resolvedAssetId}, ${employeeId}, ${auth.sub},
            ${body.notes ? String(body.notes) : null}
          )
        `;
      } catch {
        /* ignore assignment history error */
      }
    }

    // 3. Core: update asset assignment & status
    await sql`
      UPDATE assets SET
        status = 'deployed',
        assigned_employee_id = ${employeeId},
        updated_at = NOW()
      WHERE id = ${resolvedAssetId}
    `;

    // 4. Log ownership history
    try {
      await sql`
        INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
        VALUES (
          ${tenantId}, ${resolvedAssetId}, 'ASSIGNED', 'Asset assigned to employee', ${assignedBy}
        )
      `;
    } catch {
      /* ignore if ownership_history table does not exist */
    }

    // 5. Audit log
    try {
      const audit = body.audit;
      await insertAuditLog({
        tenantId,
        userId: audit?.userId ?? auth.sub,
        userName: audit?.userName ?? assignedBy,
        action: 'ASSIGN',
        entityType: 'asset',
        entityId: resolvedAssetId,
        entityLabel: audit?.entityLabel ?? resolvedAssetId,
        details: audit?.details ?? 'Asset assigned to employee',
      });
    } catch {
      /* ignore */
    }

    const rows = await sql`
      SELECT * FROM assets WHERE id = ${resolvedAssetId}
    ` as DbAsset[];
    return json(mapAsset(rows[0]));
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Assign failed', 500);
  }
}
