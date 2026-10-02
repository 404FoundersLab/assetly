import { getSql, json, error, corsPreflight, parseBody } from '../../_lib/db';
import { requireAuth, hashPassword, insertAuditLog } from '../../_lib/auth';
import type { DbTenant } from '../../_lib/mappers';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  // Only Platform Admins can reset tenant admin passwords
  if (auth.role !== 'platform_admin') {
    return error('Forbidden: Only platform admins can reset organization passwords', 403);
  }

  if (req.method !== 'POST') {
    return error('Method not allowed', 405);
  }

  const url = new URL(req.url);
  // Support both /api/tenants/[id]/reset-password and query params
  const segments = url.pathname.split('/').filter(Boolean);
  // e.g. ['api', 'tenants', '11111111-1111-1111-1111-111111111111', 'reset-password']
  const tenantId = segments[segments.length - 2] || segments[segments.length - 1];

  if (!tenantId || tenantId === 'tenants') {
    return error('Invalid tenant ID', 400);
  }

  try {
    const body = await parseBody<{
      password?: string;
      email?: string;
      mustChangePassword?: boolean;
    }>(req);

    const newPassword = String(body.password ?? '').trim();
    if (!newPassword || newPassword.length < 8) {
      return error('Password must be at least 8 characters long', 400);
    }

    const sql = getSql();
    const tenants = (await sql`
      SELECT id, name, slug, admin_email, admin_name FROM tenants WHERE id = ${tenantId} LIMIT 1
    `) as DbTenant[];

    if (tenants.length === 0) {
      return error('Organization not found', 404);
    }

    const tenant = tenants[0];
    const targetEmail = String(body.email || tenant.admin_email || '').trim().toLowerCase();

    if (!targetEmail) {
      return error('No admin email configured for this organization', 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    const mustChange = body.mustChangePassword ?? true;

    // 1. Ensure user exists in users table
    const existingUsers = (await sql`
      SELECT id FROM users WHERE lower(email) = ${targetEmail} LIMIT 1
    `) as { id: string }[];

    if (existingUsers.length === 0) {
      const newUserId = crypto.randomUUID();
      const adminName = tenant.admin_name || 'Admin';
      const names = adminName.split(' ');
      const firstName = names[0] || 'Admin';
      const lastName = names.slice(1).join(' ') || '';

      await sql`
        INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
        VALUES (${newUserId}, ${tenantId}, ${targetEmail}, ${firstName}, ${lastName}, 'tenant_admin')
        ON CONFLICT (email) DO UPDATE SET tenant_id = ${tenantId}, role = 'tenant_admin'
      `;
    }

    // 2. Ensure user_passwords table exists and update/insert password
    try {
      await sql`
        INSERT INTO user_passwords (email, password_hash, updated_at, must_change_password)
        VALUES (${targetEmail}, ${hashedPassword}, NOW(), ${mustChange})
        ON CONFLICT (email) DO UPDATE SET 
          password_hash = ${hashedPassword},
          updated_at = NOW(),
          must_change_password = ${mustChange}
      `;
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : '';
      if (msg.includes('user_passwords')) {
        return error('Password storage is not initialized in database.', 503);
      }
      throw dbErr;
    }

    // 3. Log audit event
    await insertAuditLog({
      userId: auth.sub,
      userName: `${auth.firstName} ${auth.lastName}`,
      action: 'UPDATE',
      entityType: 'tenant_password',
      entityId: tenantId,
      entityLabel: tenant.name,
      details: `Platform admin reset password for ${targetEmail} (${tenant.slug})`,
    });

    return json({
      success: true,
      message: `Password successfully reset for ${targetEmail}`,
      email: targetEmail,
      mustChangePassword: mustChange,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to reset password';
    return error(message, 500);
  }
}
