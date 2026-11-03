import { z, parseValidated, looseBody, text } from '../_lib/validate';
import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapAsset, type DbAsset } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId) return error('Tenant ID is required', 400);
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseValidated(req, looseBody({ audit:z.record(z.string(),z.string()).optional(), assetId:text(128), returnCondition:text(500) }));

    const assetId = String(body.assetId ?? '').trim();
    const performedBy = `${auth.firstName} ${auth.lastName}`.trim();
    const returnCondition = body.returnCondition ? String(body.returnCondition) : 'Good condition';

    if (!assetId) return error('assetId is required', 400);

    const sql = await getTenantSql(auth.tenantId);
    const tenantId = auth.tenantId;

    const existing = await sql`
      SELECT id FROM assets WHERE tenant_id = ${tenantId} AND (id::text = ${assetId} OR asset_tag = ${assetId}) LIMIT 1
    ` as { id: string }[];
    if (existing.length === 0) return error('Asset not found', 404);

    const resolvedAssetId = existing[0].id;

    try {
      await sql`
        UPDATE asset_assignments SET
          returned_at = NOW(),
          return_condition = ${returnCondition}
        WHERE asset_id = ${resolvedAssetId} AND tenant_id = ${tenantId} AND returned_at IS NULL
      `;
    } catch {
      /* ignore if table does not exist */
    }

    await sql`
      UPDATE assets SET
        status = 'in_stock',
        assigned_employee_id = NULL,
        updated_at = NOW()
      WHERE id = ${resolvedAssetId} AND tenant_id = ${tenantId}
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
        userId: auth.sub,
        userName: performedBy,
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
      SELECT * FROM assets WHERE id = ${resolvedAssetId} AND tenant_id = ${tenantId}
    ` as DbAsset[];
    return json(mapAsset(rows[0]));
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Return failed', 500);
  }
}
