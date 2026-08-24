import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapVendor, type DbVendor } from '../_lib/mappers';
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
  if (!id || id === 'vendors') return error('Vendor id required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'PATCH') {
      const body = await parseBody<Record<string, unknown>>(req);
      const rows = await sql`
        UPDATE vendors SET
          name = COALESCE(${body.name ? String(body.name) : null}, name),
          contact_email = COALESCE(${body.contactEmail != null ? String(body.contactEmail) : null}, contact_email),
          website = COALESCE(${body.website != null ? String(body.website) : null}, website)
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbVendor[];
      if (rows.length === 0) return error('Vendor not found', 404);

      const vendor = mapVendor(rows[0]);
      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'vendor',
        entityId: id,
        entityLabel: vendor.name,
        details: 'Vendor updated',
      });
      return json(vendor);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM vendors WHERE id = ${id} AND tenant_id = ${auth.tenantId!}`;
      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'vendor',
        entityId: id,
        entityLabel: id,
        details: 'Vendor deleted',
      });
      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Request failed', 500);
  }
}
