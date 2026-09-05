import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import {
  DEFAULT_DEVICE_TYPES,
  inferDeviceFamily,
  isDeviceFamily,
  mapAssetCategory,
  slugifyDeviceType,
} from '../_lib/asset-categories';

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

function defaultMapped(tenantId: string) {
  return DEFAULT_DEVICE_TYPES.map((t) =>
    mapAssetCategory({
      id: `default-${t.slug}`,
      tenant_id: tenantId,
      slug: t.slug,
      label: t.label,
      sort_order: t.sortOrder,
      is_active: true,
      show_in_requests: t.showInRequests,
      is_peripheral: t.isPeripheral,
      family: t.family,
    }),
  );
}

async function listCategories(sql: Awaited<ReturnType<typeof getTenantSql>>, tenantId: string) {
  try {
    return await sql`
      SELECT id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral, family
      FROM asset_categories
      WHERE tenant_id = ${tenantId}
      ORDER BY sort_order ASC, label ASC
    ` as CategoryRow[];
  } catch {
    return await sql`
      SELECT id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral
      FROM asset_categories
      WHERE tenant_id = ${tenantId}
      ORDER BY sort_order ASC, label ASC
    ` as CategoryRow[];
  }
}

async function seedDefaults(sql: Awaited<ReturnType<typeof getTenantSql>>, tenantId: string) {
  for (const t of DEFAULT_DEVICE_TYPES) {
    const id = crypto.randomUUID();
    try {
      await sql`
        INSERT INTO asset_categories (id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral, family)
        VALUES (${id}, ${tenantId}, ${t.slug}, ${t.label}, ${t.sortOrder}, true, ${t.showInRequests}, ${t.isPeripheral}, ${t.family})
        ON CONFLICT (tenant_id, slug) DO NOTHING
      `;
    } catch {
      await sql`
        INSERT INTO asset_categories (id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral)
        VALUES (${id}, ${tenantId}, ${t.slug}, ${t.label}, ${t.sortOrder}, true, ${t.showInRequests}, ${t.isPeripheral})
        ON CONFLICT (tenant_id, slug) DO NOTHING
      `;
    }
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'GET') {
      let rows: CategoryRow[] = [];
      try {
        rows = await listCategories(sql, auth.tenantId!);
        if (rows.length === 0) {
          await seedDefaults(sql, auth.tenantId!);
          rows = await listCategories(sql, auth.tenantId!);
        }
      } catch {
        return json(defaultMapped(auth.tenantId!));
      }
      return json(rows.map(mapAssetCategory));
    }

    if (req.method === 'POST') {
      const body = await parseBody<Record<string, unknown>>(req);
      const label = String(body.label ?? '').trim();
      if (!label) return error('label is required', 400);
      const slug = slugifyDeviceType(String(body.slug ?? label));
      const id = body.id ? String(body.id) : crypto.randomUUID();
      const sortOrder = Number(body.sortOrder ?? 200);
      const showInRequests = body.showInRequests === true;
      const family = isDeviceFamily(body.family) ? body.family : inferDeviceFamily(slug, body.isPeripheral === true);
      const isPeripheral = family === 'peripheral';

      let rows: CategoryRow[];
      try {
        rows = await sql`
          INSERT INTO asset_categories (id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral, family)
          VALUES (${id}, ${auth.tenantId!}, ${slug}, ${label}, ${sortOrder}, true, ${showInRequests}, ${isPeripheral}, ${family})
          RETURNING id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral, family
        ` as CategoryRow[];
      } catch {
        rows = await sql`
          INSERT INTO asset_categories (id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral)
          VALUES (${id}, ${auth.tenantId!}, ${slug}, ${label}, ${sortOrder}, true, ${showInRequests}, ${isPeripheral})
          RETURNING id, tenant_id, slug, label, sort_order, is_active, show_in_requests, is_peripheral
        ` as CategoryRow[];
      }

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'asset_category',
        entityId: id,
        entityLabel: label,
        details: `Device type created (${slug})`,
      });

      return json(mapAssetCategory(rows[0]), 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('unique') || message.includes('duplicate')) {
      return error('A device type with this name already exists', 409);
    }
    return error(message, 500);
  }
}
