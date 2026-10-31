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
      performedBy?: string;
      returnCondition?: string;
      audit?: Record<string, string>;
    }>(req);

    const assetId = String(body.assetId ?? '').trim();
    const performedBy = String(body.performedBy ?? `${auth.firstName} ${auth.lastName}`).trim();
    const returnCondition = body.returnCondition ? String(body.returnCondition) : 'Good condition';

    if (!assetId) return error('assetId is required', 400);

    const sql = await getTenantSql(auth.tenantId!);

    const existing = await sql`
      SELECT id, tenant_id FROM assets WHERE id = ${assetId} OR asset_tag = ${assetId} LIMIT 1
    ` as { id: string; tenant_id?: string }[];
    if (existing.length === 0) return error('Asset not found', 404);

    const resolvedAssetId = existing[0].id;
    const tenantId = auth.tenantId || existing[0].tenant_id || '11111111-1111-1111-1111-111111111111';

    try {
      await sql`
        UPDATE asset_assignments SET
          returned_at = NOW(),
          return_condition = ${returnCondition}
        WHERE asset_id = ${resolvedAssetId} AND returned_at IS NULL
      `;
    } catch {
      /* ignore if table does not exist */
    }

    await sql`
      UPDATE assets SET
        status = 'in_stock',
        assigned_employee_id = NULL,
        updated_at = NOW()
      WHERE id = ${resolvedAssetId}
    `;

    try {
      await sql`
        INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
        VALUES (
          ${tenantId}, ${resolvedAssetId}, 'RETURNED',
          ${`Returned — ${returnCondition}`}, ${performedBy}
        )
      `;
    } catch {
      /* ignore */
    }

    try {
      const audit = body.audit;
      await insertAuditLog({
        tenantId,
        userId: audit?.userId ?? auth.sub,
        userName: audit?.userName ?? performedBy,
        action: 'RETURN',
        entityType: 'asset',
        entityId: resolvedAssetId,
        entityLabel: audit?.entityLabel ?? resolvedAssetId,
        details: audit?.details ?? `Returned — ${returnCondition}`,
      });
    } catch {
      /* ignore */
    }

    const rows = await sql`
      SELECT * FROM assets WHERE id = ${resolvedAssetId}
    ` as DbAsset[];
    return json(mapAsset(rows[0]));
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Return failed', 500);
  }
}
