import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapTenant, type DbTenant } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  if (auth.role !== 'platform_admin') {
    return error('Forbidden', 403);
  }

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id || id === 'tenants') return error('Invalid tenant ID', 400);

  const sql = getSql();

  try {
    if (req.method === 'PATCH') {
      const body = await parseBody<Record<string, unknown>>(req);
      
      const rows = await sql`
        UPDATE tenants
        SET 
          name = COALESCE(${body.name ? String(body.name) : null}, name),
          slug = COALESCE(${body.slug ? String(body.slug) : null}, slug),
          plan = COALESCE(${body.plan ? String(body.plan) : null}, plan),
          domain = COALESCE(${body.domain ? String(body.domain) : null}, domain),
          infrastructure_strategy = COALESCE(${body.infrastructureStrategy ? String(body.infrastructureStrategy) : null}, infrastructure_strategy),
          admin_email = COALESCE(${body.adminEmail ? String(body.adminEmail) : null}, admin_email),
          admin_name = COALESCE(${body.adminName ? String(body.adminName) : null}, admin_name),
          billing_region = COALESCE(${body.billingRegion ? (String(body.billingRegion).toUpperCase() === 'GLOBAL' ? 'GLOBAL' : 'IN') : null}, billing_region)
        WHERE id = ${id}
        RETURNING *
      ` as DbTenant[];

      if (rows.length === 0) return error('Tenant not found', 404);

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'tenant',
        entityId: id,
        entityLabel: rows[0].name,
        details: `Updated tenant ${rows[0].slug}`,
      });

      return json(mapTenant(rows[0]));
    }

    if (req.method === 'DELETE') {
      const rows = await sql`
        DELETE FROM tenants WHERE id = ${id} RETURNING name, slug
      ` as { name: string; slug: string }[];

      if (rows.length === 0) return error('Tenant not found', 404);

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'tenant',
        entityId: id,
        entityLabel: rows[0].name,
        details: `Deleted tenant ${rows[0].slug}`,
      });

      return json({ success: true, id });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}
