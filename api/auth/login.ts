import { json, error, corsPreflight, parseBody, getSql } from '../_lib/db';
import { DEMO_USERS } from '../_lib/demo-users';
import { signAuthToken, verifyPassword, insertAuditLog } from '../_lib/auth';
import { isDemoAuthEnabled } from '../_lib/security';
import { mapTenant, type DbUser, type DbTenant } from '../_lib/mappers';
import {
  isPortfolioGuestEmail,
  isPortfolioGuestEnabled,
  matchPortfolioGuest,
  PORTFOLIO_GUEST_EMAIL,
  PORTFOLIO_GUEST_NAME,
} from '../_lib/portfolio-guest';

export const config = { runtime: 'edge' };

async function resolvePortfolioGuestSession() {
  const sql = getSql();
  const configuredTenant = process.env.PORTFOLIO_GUEST_TENANT_ID?.trim();

  let tenantRows: DbTenant[] = [];
  const tryLoad = async (query: Promise<unknown>) => {
    try {
      const rows = (await query) as DbTenant[];
      if (rows.length > 0) tenantRows = rows;
    } catch {
      /* table or column may not exist */
    }
  };

  if (configuredTenant) {
    await tryLoad(sql`SELECT * FROM companies WHERE id = ${configuredTenant} LIMIT 1`);
    if (tenantRows.length === 0) {
      await tryLoad(sql`SELECT * FROM tenants WHERE id = ${configuredTenant} LIMIT 1`);
    }
  }
  if (tenantRows.length === 0) {
    await tryLoad(sql`SELECT * FROM tenants LIMIT 1`);
  }
  if (tenantRows.length === 0) {
    await tryLoad(sql`SELECT * FROM companies LIMIT 1`);
  }
  if (tenantRows.length === 0) return null;

  const tenant = mapTenant(tenantRows[0]);
  const existing = await sql`
    SELECT id FROM users WHERE lower(email) = ${PORTFOLIO_GUEST_EMAIL} LIMIT 1
  ` as { id: string }[];
  const userId = existing[0]?.id ?? crypto.randomUUID();
  try {
    await sql`
      INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
      VALUES (
        ${userId},
        ${tenant.id},
        ${PORTFOLIO_GUEST_EMAIL},
        ${PORTFOLIO_GUEST_NAME.firstName},
        ${PORTFOLIO_GUEST_NAME.lastName},
        'viewer'
      )
      ON CONFLICT (email) DO UPDATE SET
        role = 'viewer',
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name
    `;
  } catch {
    await sql`
      UPDATE users
      SET role = 'viewer', first_name = ${PORTFOLIO_GUEST_NAME.firstName}, last_name = ${PORTFOLIO_GUEST_NAME.lastName}
      WHERE lower(email) = ${PORTFOLIO_GUEST_EMAIL}
    `;
    if (existing.length === 0) {
      await sql`
        INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
        VALUES (
          ${userId},
          ${tenant.id},
          ${PORTFOLIO_GUEST_EMAIL},
          ${PORTFOLIO_GUEST_NAME.firstName},
          ${PORTFOLIO_GUEST_NAME.lastName},
          'viewer'
        )
      `;
    }
  }

  return {
    user: {
      id: userId,
      tenantId: tenant.id,
      email: PORTFOLIO_GUEST_EMAIL,
      firstName: PORTFOLIO_GUEST_NAME.firstName,
      lastName: PORTFOLIO_GUEST_NAME.lastName,
      role: 'viewer' as const,
    },
    tenant,
  };
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseBody<{ email?: string; password?: string }>(req);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email) return error('Email is required', 400);
    if (isPortfolioGuestEmail(email) && !isPortfolioGuestEnabled()) {
      return error('Invalid email or password', 401);
    }

    let optionalFirstTime = false;
    try {
      const sql = getSql();
      if (isPortfolioGuestEmail(email)) {
        /* guest never uses first-login password bypass */
      } else {
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
      }
    } catch {
      // Ignore
    }

    if (!password && !optionalFirstTime) {
      return error('Email and password are required', 400);
    }

    if (matchPortfolioGuest(email, password)) {
      try {
        const guest = await resolvePortfolioGuestSession();
        if (!guest) return error('Demo guest is not configured', 503);
        const token = await signAuthToken(guest.user);
        try {
          await insertAuditLog({
            tenantId: guest.user.tenantId,
            userId: guest.user.id,
            userName: `${guest.user.firstName} ${guest.user.lastName}`,
            action: 'LOGIN',
            entityType: 'user',
            entityId: guest.user.id,
            entityLabel: guest.user.email,
            details: 'Portfolio guest signed in (read-only)',
          });
        } catch {
          /* login should succeed even if audit log is unavailable */
        }
        return json({ token, user: guest.user, tenant: guest.tenant });
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Demo guest sign-in failed', 500);
      }
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
      // Fetch user + derive role from user_roles JOIN (our schema uses a join table)
      const users = await sql`
        SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name,
               COALESCE(r.name, u.role, 'viewer') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE lower(u.email) = ${email}
        LIMIT 1
      ` as DbUser[];
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

        // Our schema uses 'companies' — try that first, fall back to 'tenants'
        let tenants: DbTenant[] = [];
        try {
          tenants = await sql`SELECT * FROM companies WHERE id = ${u.tenant_id}` as DbTenant[];
        } catch {
          try {
            tenants = await sql`SELECT * FROM tenants WHERE id = ${u.tenant_id}` as DbTenant[];
          } catch { /* ignore */ }
        }
        tenantRecord = tenants.length > 0 ? mapTenant(tenants[0]) : null;
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
