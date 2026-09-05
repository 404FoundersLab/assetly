import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import { isDeviceFamily, mapAssetCategory, slugifyDeviceType } from '../_lib/asset-categories';

export const config = { runtime: 'edge' };

type CategoryRow = {
  id: string;
  tenant_id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  show_in_requests: boolean;
  is_peripheral: boolean;
  family?: string | null;
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const url = new URL(req.url);
  const id = url.pathname.split('/').filter(Boolean).pop();
  if (!id || id === 'asset-categories') return error('Device type id required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'PATCH') {
      const body = await parseBody<Record<string, unknown>>(req);
      const label = body.label != null ? String(body.label).trim() : null;
      const slug = body.slug != null ? slugifyDeviceType(String(body.slug)) : null;
      const sortOrder = body.sortOrder != null ? Number(body.sortOrder) : null;
      const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;
      const showInRequests = typeof body.showInRequests === 'boolean' ? body.showInRequests : null;
      const family = isDeviceFamily(body.family) ? body.family : null;
      const isPeripheral = family
        ? family === 'peripheral'
        : typeof body.isPeripheral === 'boolean'
          ? body.isPeripheral
          : null;

      let rows: CategoryRow[];
      try {
        rows = await sql`
          UPDATE asset_categories SET
            label = COALESCE(${label}, label),
            slug = COALESCE(${slug}, slug),
            sort_order = COALESCE(${sortOrder}, sort_order),
            is_active = COALESCE(${isActive}, is_active),
            show_in_requests = COALESCE(${showInRequests}, show_in_requests),
            is_peripheral = COALESCE(${isPeripheral}, is_peripheral),
            family = COALESCE(${family}, family)
          WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
          RETURNING id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral, family
        ` as CategoryRow[];
      } catch {
        rows = await sql`
          UPDATE asset_categories SET
            label = COALESCE(${label}, label),
            slug = COALESCE(${slug}, slug),
            sort_order = COALESCE(${sortOrder}, sort_order),
            is_active = COALESCE(${isActive}, is_active),
            show_in_requests = COALESCE(${showInRequests}, show_in_requests),
            is_peripheral = COALESCE(${isPeripheral}, is_peripheral)
          WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
          RETURNING id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral
        ` as CategoryRow[];
      }
      if (rows.length === 0) return error('Device type not found', 404);

      const mapped = mapAssetCategory(rows[0]);
      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'asset_category',
        entityId: id,
        entityLabel: mapped.label,
        details: 'Device type updated',
      });
      return json(mapped);
    }

    if (req.method === 'DELETE') {
      const existing = await sql`
        SELECT slug, label FROM asset_categories WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
      ` as { slug: string; label: string }[];
      if (existing.length === 0) return error('Device type not found', 404);

      const inUse = await sql`
        SELECT COUNT(*)::int AS count FROM assets
        WHERE tenant_id = ${auth.tenantId!} AND category = ${existing[0].slug}
      ` as { count: number }[];
      if ((inUse[0]?.count ?? 0) > 0) {
        return error('Cannot delete a device type that is assigned to assets. Deactivate it instead.', 409);
      }

      await sql`DELETE FROM asset_categories WHERE id = ${id} AND tenant_id = ${auth.tenantId!}`;
      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'asset_category',
        entityId: id,
        entityLabel: existing[0].label,
        details: 'Device type deleted',
      });
      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Request failed', 500);
  }
}
