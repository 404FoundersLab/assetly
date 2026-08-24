import { json, error, corsPreflight, parseBody, getSql } from '../_lib/db';
import { DEMO_USERS } from '../_lib/demo-users';
import { signAuthToken, verifyPassword, insertAuditLog } from '../_lib/auth';
import { isDemoAuthEnabled } from '../_lib/security';
import { mapTenant, type DbUser, type DbTenant } from '../_lib/mappers';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseBody<{ email?: string; password?: string }>(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email) return error('Email is required', 400);

    let optionalFirstTime = false;
    try {
      const sql = getSql();
      const rows = await sql`SELECT password_hash FROM user_passwords WHERE email = ${email}` as { password_hash: string }[];
      if (rows.length > 0 && rows[0].password_hash === 'optional-on-first-login') {
        optionalFirstTime = true;
      } else if (rows.length === 0) {
        const employees = await sql`
          SELECT id, tenant_id, email, first_name, last_name 
          FROM employees 
          WHERE lower(COALESCE(official_email, joining_email, email)) = ${email}
             OR lower(email) = ${email}
          LIMIT 1
        ` as { id: string; tenant_id: string; email: string; first_name: string; last_name: string }[];

        if (employees.length > 0) {
          const emp = employees[0];
          const userId = crypto.randomUUID();
          
          await sql`
            INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
            VALUES (${userId}, ${emp.tenant_id}, ${emp.email}, ${emp.first_name}, ${emp.last_name || ''}, 'employee')
            ON CONFLICT (tenant_id, email) DO NOTHING
          `;
          
          await sql`
            INSERT INTO user_passwords (email, password_hash, must_change_password)
            VALUES (${emp.email}, 'optional-on-first-login', true)
            ON CONFLICT (email) DO NOTHING
          `;
          
          optionalFirstTime = true;
        }
      }
    } catch {
      // Ignore
    }

    if (!password && !optionalFirstTime) {
      return error('Email and password are required', 400);
    }

    let userRecord: any = null;
    const SYSTEM_TENANT = {
      id: 'system',
      name: 'Assetly Platform',
      slug: 'system',
      plan: 'Enterprise',
    };
    let tenantRecord: any = SYSTEM_TENANT;

    try {
      const sql = getSql();
      const users = await sql`SELECT * FROM users WHERE email = ${email}` as DbUser[];
      if (users.length > 0) {
        const u = users[0];
        userRecord = {
          id: u.id,
          tenantId: u.tenant_id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name || '',
          role: u.role,
        };

        const tenants = await sql`SELECT * FROM tenants WHERE id = ${u.tenant_id}` as DbTenant[];
        if (tenants.length > 0) {
          tenantRecord = mapTenant(tenants[0]);
        } else {
          tenantRecord = null;
        }
      }
    } catch {
      // Ignore DB errors and optionally fall back to demo users
    }

    if (!userRecord) {
      if (!isDemoAuthEnabled()) return error('Invalid email or password', 401);
      const cred = DEMO_USERS[email];
      if (!cred) return error('Invalid email or password', 401);
      userRecord = cred.user;
    }

    const valid = await verifyPassword(email, password);
    if (!valid) return error('Invalid email or password', 401);

    let mustChange = false;
    try {
      const sql = getSql();
      const rows = await sql`SELECT must_change_password FROM user_passwords WHERE email = ${email}` as { must_change_password: boolean }[];
      if (rows.length > 0 && rows[0].must_change_password) {
        mustChange = true;
      }
    } catch {
      // Ignore DB errors if column doesn't exist
    }

    const token = await signAuthToken(userRecord);

    if (mustChange) {
      return json({
        token,
        user: userRecord,
        tenant: tenantRecord,
        requirePasswordSetup: true,
      });
    }

    try {
      await insertAuditLog({
        tenantId: userRecord.tenantId,
        userId: userRecord.id,
        userName: `${userRecord.firstName} ${userRecord.lastName}`,
        action: 'LOGIN',
        entityType: 'user',
        entityId: userRecord.id,
        entityLabel: userRecord.email,
        details: 'User signed in',
      });
    } catch {
      /* login should succeed even if audit log table is unavailable */
    }

    return json({
      token,
      user: userRecord,
      tenant: tenantRecord,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Login failed', 500);
  }
}
