import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapUser, type DbUser } from '../_lib/mappers';
import { requireAuth, insertAuditLog, hashPassword } from '../_lib/auth';
import { checkAdminLimit } from '../_lib/subscription';
import {
  assertTenantAccess,
  canManageUsers,
  getUserTenantId,
  isRoleAllowedForActor,
  PLATFORM_ADMIN_ROLE,
} from '../_lib/roles';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  if (!canManageUsers(auth.role)) {
    return error('Forbidden', 403);
  }

  const sql = getSql();

  try {
    if (req.method === 'GET') {
      let rows;
      if (auth.role === PLATFORM_ADMIN_ROLE) {
        rows = await sql`SELECT * FROM users ORDER BY created_at DESC` as DbUser[];
      } else {
        rows = await sql`SELECT * FROM users WHERE tenant_id = ${auth.tenantId || ''} ORDER BY created_at DESC` as DbUser[];
      }
      return json(rows.map(mapUser));
    }

    if (req.method === 'POST') {
      const body = await parseBody<Record<string, unknown>>(req);
      const email = String(body.email ?? '').trim().toLowerCase();
      const firstName = String(body.firstName ?? '').trim();
      const lastName = String(body.lastName ?? '').trim();
      const role = String(body.role ?? 'viewer').trim();
      let tenantId = String(body.tenantId ?? '');

      if (!email || !firstName || !tenantId) {
        return error('email, firstName, and tenantId are required', 400);
      }

      if (!isRoleAllowedForActor(auth.role, role)) {
        return error(`Your role cannot assign the "${role}" role`, 403);
      }

      const tenantDenied = assertTenantAccess(auth, tenantId);
      if (tenantDenied) return tenantDenied;

      if (auth.role !== PLATFORM_ADMIN_ROLE) {
        tenantId = auth.tenantId!;
      }

      const adminRoles = ['tenant_admin', 'it_admin', 'platform_admin'];
      if (adminRoles.includes(role)) {
        const limitCheck = await checkAdminLimit(tenantId);
        if (!limitCheck.allowed) return error(limitCheck.message ?? 'Plan limit reached', 402);
      }

      const id = body.id && String(body.id) ? String(body.id) : crypto.randomUUID();

      const rows = await sql`
        INSERT INTO users (
          id, tenant_id, email, first_name, last_name, role
        ) VALUES (
          ${id}, ${tenantId}, ${email}, ${firstName}, ${lastName}, ${role}
        )
        RETURNING *
      ` as DbUser[];

      const randomSuffix = crypto.randomUUID().split('-')[0].toUpperCase();
      const generatedPassword = `Temp-${randomSuffix}`;
      const hashed = await hashPassword(generatedPassword);

      await sql`
        INSERT INTO user_passwords (email, password_hash, must_change_password)
        VALUES (${email}, ${hashed}, true)
        ON CONFLICT (email) DO UPDATE SET password_hash = ${hashed}, must_change_password = true
      `;

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'user',
        entityId: id,
        entityLabel: email,
        details: `Created user ${email} with role ${role}`,
      });

      return json({ ...mapUser(rows[0]), generatedPassword }, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('unique') || message.includes('duplicate')) {
      return error('User email already exists', 409);
    }
    return error(message, 500);
  }
}
