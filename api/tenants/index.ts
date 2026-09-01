import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapTenant, type DbTenant } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import { provisionTenantDatabase } from '../_lib/provision';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  // Only Platform Admins can manage tenants
  if (auth.role !== 'platform_admin') {
    return error('Forbidden', 403);
  }

  const sql = getSql();

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM tenants ORDER BY created_at DESC
      ` as DbTenant[];
      return json(rows.map(mapTenant));
    }

    if (req.method === 'POST') {
      const body = await parseBody<Record<string, unknown>>(req);
      const name = String(body.name ?? '').trim();
      const slug = String(body.slug ?? '').trim();
      const plan = String(body.plan ?? 'Professional').trim();
      const billingRegion = String(body.billingRegion ?? 'IN').toUpperCase() === 'GLOBAL' ? 'GLOBAL' : 'IN';

      if (!name || !slug) {
        return error('name and slug are required', 400);
      }

      const id = body.id && String(body.id) ? String(body.id) : crypto.randomUUID();
      const strategy = body.infrastructureStrategy ? String(body.infrastructureStrategy) : 'shared';

      // Auto-provision a dedicated Neon branch when strategy = 'dedicated'
      // and NEON_API_KEY + NEON_PROJECT_ID are configured.
      let dedicatedDbUrl: string | null = null;
      if (strategy === 'dedicated') {
        try {
          dedicatedDbUrl = await provisionTenantDatabase(slug);
        } catch (provisionErr) {
          const msg = provisionErr instanceof Error ? provisionErr.message : 'Provisioning failed';
          return error(`Failed to provision dedicated database: ${msg}`, 500);
        }
      }

      const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null;
      const adminName = body.adminName ? String(body.adminName).trim() : 'Admin';

      const rows = await sql`
        INSERT INTO tenants (
          id, name, slug, plan, domain, infrastructure_strategy, admin_email, admin_name, database_url, billing_region
        ) VALUES (
          ${id}, ${name}, ${slug}, ${plan},
          ${body.domain ? String(body.domain) : null},
          ${strategy},
          ${adminEmail},
          ${adminName},
          ${dedicatedDbUrl},
          ${billingRegion}
        )
        RETURNING *
      ` as DbTenant[];

      let generatedPassword: string | undefined;
      if (adminEmail) {
        try {
          const userId = crypto.randomUUID();
          const names = adminName.split(' ');
          const firstName = names[0] || 'Admin';
          const lastName = names.slice(1).join(' ') || '';

          await sql`
            INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
            VALUES (${userId}, ${id}, ${adminEmail}, ${firstName}, ${lastName}, 'tenant_admin')
            ON CONFLICT (email) DO UPDATE SET tenant_id = ${id}, role = 'tenant_admin'
          `;

          const randomSuffix = crypto.randomUUID().split('-')[0].toUpperCase();
          generatedPassword = `Temp-${randomSuffix}`;
          const hashed = await hashPassword(generatedPassword);

          await sql`
            INSERT INTO user_passwords (email, password_hash, must_change_password)
            VALUES (${adminEmail}, ${hashed}, true)
            ON CONFLICT (email) DO UPDATE SET password_hash = ${hashed}, must_change_password = true
          `;
        } catch {
          // Non-blocking if user creation fails
        }
      }

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'tenant',
        entityId: id,
        entityLabel: name,
        details: `Provisioned tenant ${slug}`,
      });

      return json({ ...mapTenant(rows[0]), generatedPassword }, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('unique') || message.includes('duplicate')) {
      return error('Tenant slug already exists', 409);
    }
    return error(message, 500);
  }
}
