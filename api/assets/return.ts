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
      performedBy?: string;
      returnCondition?: string;
      audit?: Record<string, string>;
    }>(req);

    const assetId = String(body.assetId ?? '');
    const performedBy = String(body.performedBy ?? `${auth.firstName} ${auth.lastName}`);
    const returnCondition = body.returnCondition ? String(body.returnCondition) : 'Good condition';

    if (!assetId) return error('assetId is required', 400);

    const sql = await getTenantSql(auth.tenantId!);

    const existing = await sql`
      SELECT id FROM assets WHERE id = ${assetId} AND tenant_id = ${auth.tenantId!}
    ` as { id: string }[];
    if (existing.length === 0) return error('Asset not found', 404);

    await sql`
      UPDATE asset_assignments SET
        returned_at = NOW(),
        return_condition = ${returnCondition}
      WHERE asset_id = ${assetId} AND tenant_id = ${auth.tenantId!} AND returned_at IS NULL
    `;

    await sql`
      UPDATE assets SET
        status = 'in_stock',
        assigned_employee_id = NULL,
        updated_at = NOW()
      WHERE id = ${assetId} AND tenant_id = ${auth.tenantId!}
    `;

    await sql`
      INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
      VALUES (
        ${auth.tenantId!}, ${assetId}, 'RETURNED',
        ${`Returned — ${returnCondition}`}, ${performedBy}
      )
    `;

    const audit = body.audit;
    await insertAuditLog({
      userId: audit?.userId ?? auth.sub,
      userName: audit?.userName ?? performedBy,
      action: 'RETURN',
      entityType: 'asset',
      entityId: assetId,
      entityLabel: audit?.entityLabel ?? assetId,
      details: audit?.details ?? `Returned — ${returnCondition}`,
    });

    const rows = await sql`
      SELECT * FROM assets WHERE id = ${assetId} AND tenant_id = ${auth.tenantId!}
    ` as DbAsset[];
    return json(mapAsset(rows[0]));
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Return failed', 500);
  }
}
