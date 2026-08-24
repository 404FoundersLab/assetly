import { getSql, getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapAsset, type DbAsset } from '../_lib/mappers';
import { verifyAuthToken, requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const rawId = parts[parts.length - 1];

  if (!rawId || rawId === 'assets') return error('Asset id required', 400);

  const id = decodeURIComponent(rawId).trim();

  // Allow public/unauthenticated GET requests for QR code lookup
  if (req.method === 'GET') {
    const auth = await verifyAuthToken(req);
    const sql = auth?.tenantId ? await getTenantSql(auth.tenantId) : getSql();

    let rows: DbAsset[] = [];
    if (isUuid(id)) {
      if (auth?.tenantId) {
        rows = (await sql`
          SELECT * FROM assets WHERE (id = ${id} OR asset_tag = ${id}) AND tenant_id = ${auth.tenantId}
        `) as DbAsset[];
      } else {
        rows = (await sql`
          SELECT * FROM assets WHERE id = ${id} OR asset_tag = ${id}
        `) as DbAsset[];
      }
    } else {
      if (auth?.tenantId) {
        rows = (await sql`
          SELECT * FROM assets WHERE asset_tag = ${id} AND tenant_id = ${auth.tenantId}
        `) as DbAsset[];
      } else {
        rows = (await sql`
          SELECT * FROM assets WHERE asset_tag = ${id}
        `) as DbAsset[];
      }
    }

    if (rows.length === 0) return error('Asset not found', 404);
    return json(mapAsset(rows[0]));
  }

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return error('Method not allowed', 405);

    if (req.method === 'PATCH') {
      const body = await parseBody<Record<string, unknown>>(req);
      const vendorId =
        body.vendorId !== undefined
          ? body.vendorId && isUuid(String(body.vendorId))
            ? String(body.vendorId)
            : null
          : undefined;

      const rows = await sql`
        UPDATE assets SET
          asset_tag = COALESCE(${body.assetTag ? String(body.assetTag) : null}, asset_tag),
          name = COALESCE(${body.name ? String(body.name) : null}, name),
          category = COALESCE(${body.category ? String(body.category) : null}, category),
          manufacturer = COALESCE(${body.manufacturer != null ? String(body.manufacturer) : null}, manufacturer),
          model = COALESCE(${body.model != null ? String(body.model) : null}, model),
          serial_number = COALESCE(${body.serialNumber != null ? String(body.serialNumber) : null}, serial_number),
          status = COALESCE(${body.status ? String(body.status) : null}, status),
          lifecycle_stage = COALESCE(${body.lifecycleStage ? String(body.lifecycleStage) : null}, lifecycle_stage),
          purchase_date = COALESCE(${body.purchaseDate != null ? String(body.purchaseDate) : null}, purchase_date),
          purchase_cost = COALESCE(${body.purchaseCost != null ? Number(body.purchaseCost) : null}, purchase_cost),
          current_value = COALESCE(${body.currentValue != null ? Number(body.currentValue) : null}, current_value),
          repair_cost = COALESCE(${body.repairCost != null ? Number(body.repairCost) : null}, repair_cost),
          location = COALESCE(${body.location != null ? String(body.location) : null}, location),
          department = COALESCE(${body.department != null ? String(body.department) : null}, department),
          specs = COALESCE(${body.specs != null ? String(body.specs) : null}, specs),
          image_url = COALESCE(${body.imageUrl != null ? String(body.imageUrl) : null}, image_url),
          vendor_id = COALESCE(${
            body.vendorId !== undefined
              ? body.vendorId && isUuid(String(body.vendorId))
                ? String(body.vendorId)
                : null
              : null
          }, vendor_id),
          warranty_expires_at = COALESCE(${body.warrantyExpiresAt != null ? String(body.warrantyExpiresAt) : null}, warranty_expires_at),
          notes = COALESCE(${body.notes != null ? String(body.notes) : null}, notes),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbAsset[];

      if (rows.length === 0) return error('Asset not found', 404);

      const asset = mapAsset(rows[0]);
      const audit = body.audit as Record<string, string> | undefined;
      await insertAuditLog({
        userId: audit?.userId ?? auth.sub,
        userName: audit?.userName ?? `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'asset',
        entityId: id,
        entityLabel: asset.assetTag,
        details: audit?.details ?? `Updated ${asset.name}`,
      });

      return json(asset);
    }

    if (req.method === 'DELETE') {
      const rows = await sql`
        SELECT asset_tag FROM assets WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
      ` as { asset_tag: string }[];
      if (rows.length === 0) return error('Asset not found', 404);

      await sql`DELETE FROM ownership_history WHERE asset_id = ${id} AND tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM asset_assignments WHERE asset_id = ${id} AND tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM assets WHERE id = ${id} AND tenant_id = ${auth.tenantId!}`;

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'asset',
        entityId: id,
        entityLabel: rows[0].asset_tag,
        details: 'Asset deleted',
      });

      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Request failed', 500);
  }
}
