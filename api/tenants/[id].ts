import { parseValidated, looseBody, text } from '../_lib/validate';
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
      const body = await parseValidated(req, looseBody({ name:text(200),slug:text(100),plan:text(50),billingRegion:text(50),adminEmail:text(254),adminName:text(200),domain:text(253),infrastructureStrategy:text(50) }));

      // Auto-ensure enabled_modules column exists in tenants table
      try {
        await sql`
          ALTER TABLE tenants 
          ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '["module:assets", "module:hr", "module:docs", "module:finance"]'::jsonb
        `;
      } catch {
        /* column may already exist or table is managed */
      }

      const hasModules = body.enabledModules !== undefined;
      const enabledModulesJson = hasModules
        ? JSON.stringify(Array.isArray(body.enabledModules) ? body.enabledModules : [])
        : null;

      let rows: DbTenant[] = [];
      if (hasModules && enabledModulesJson !== null) {
        try {
          rows = await sql`
            UPDATE tenants
            SET 
              name = COALESCE(${body.name ? String(body.name) : null}, name),
              slug = COALESCE(${body.slug ? String(body.slug) : null}, slug),
              plan = COALESCE(${body.plan ? String(body.plan) : null}, plan),
              domain = COALESCE(${body.domain ? String(body.domain) : null}, domain),
              infrastructure_strategy = COALESCE(${body.infrastructureStrategy ? String(body.infrastructureStrategy) : null}, infrastructure_strategy),
              admin_email = COALESCE(${body.adminEmail ? String(body.adminEmail) : null}, admin_email),
              admin_name = COALESCE(${body.adminName ? String(body.adminName) : null}, admin_name),
              billing_region = COALESCE(${body.billingRegion ? (String(body.billingRegion).toUpperCase() === 'GLOBAL' ? 'GLOBAL' : 'IN') : null}, billing_region),
              enabled_modules = ${enabledModulesJson}::jsonb
            WHERE id = ${id}
            RETURNING *
          ` as DbTenant[];
        } catch {
          rows = await sql`
            UPDATE tenants
            SET 
              name = COALESCE(${body.name ? String(body.name) : null}, name),
              slug = COALESCE(${body.slug ? String(body.slug) : null}, slug),
              plan = COALESCE(${body.plan ? String(body.plan) : null}, plan),
              domain = COALESCE(${body.domain ? String(body.domain) : null}, domain),
              infrastructure_strategy = COALESCE(${body.infrastructureStrategy ? String(body.infrastructureStrategy) : null}, infrastructure_strategy),
              admin_email = COALESCE(${body.adminEmail ? String(body.adminEmail) : null}, admin_email),
              admin_name = COALESCE(${body.adminName ? String(body.adminName) : null}, admin_name),
              billing_region = COALESCE(${body.billingRegion ? (String(body.billingRegion).toUpperCase() === 'GLOBAL' ? 'GLOBAL' : 'IN') : null}, billing_region),
              enabled_modules = ${enabledModulesJson}
            WHERE id = ${id}
            RETURNING *
          ` as DbTenant[];
        }
      } else {
        rows = await sql`
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
      }

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
      try {
        await sql`
          DELETE FROM user_passwords WHERE LOWER(email) IN (
            SELECT LOWER(email) FROM users WHERE tenant_id = ${id} AND role <> 'platform_admin'
          )
        `;
        await sql`DELETE FROM users WHERE tenant_id = ${id} AND role <> 'platform_admin'`;
      } catch {
        /* best-effort cleanup of orphaned logins */
      }

      // Child tables mostly lack ON DELETE CASCADE, so purge tenant-scoped rows before the tenant itself.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        const raw = (stmt: string) => (sql as any)(Object.assign([stmt], { raw: [stmt] }));
        try {
          const tables = (await sql`
            SELECT c.table_name FROM information_schema.columns c
            JOIN information_schema.tables t
              ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
            WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
              AND c.table_name NOT IN ('tenants', 'companies', 'audit_logs', 'users')
          ` as { table_name: string }[]).map((r) => r.table_name).filter((n) => /^[a-z0-9_]+$/i.test(n));
          let pending = tables;
          for (let pass = 0; pass < 6 && pending.length > 0; pass++) {
            const failed: string[] = [];
            for (const t of pending) {
              try {
                await raw(`DELETE FROM "${t}" WHERE tenant_id::text = '${id.toLowerCase()}'`);
              } catch {
                failed.push(t);
              }
            }
            pending = failed;
          }
        } catch {
          /* fall through; the tenant delete below reports any remaining constraint */
        }
      }
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
