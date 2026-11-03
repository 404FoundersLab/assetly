import { json, error, corsPreflight, getSql } from '../_lib/db';
import { validateBody, z } from '../_lib/validate';
import { DEMO_USERS } from '../_lib/demo-users';
import { signAuthToken, verifyPassword, insertAuditLog } from '../_lib/auth';
import { clientIp, isDemoAuthEnabled } from '../_lib/security';
import { consume, tooManyRequests } from '../_lib/ratelimit';
import { issueRefreshToken, sessionCookies } from '../_lib/session';
import { getMfaRecord, isMfaEnforced, verifyMfaWithLockout } from '../_lib/mfa';
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

const MAX_FAILED_LOGINS = 5;
const LOCK_WINDOW_MINUTES = 15;
let attemptsTableReady = false;

async function ensureAttemptsTable(sql: ReturnType<typeof getSql>) {
  if (attemptsTableReady) return;
  await sql`CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at)`;
  attemptsTableReady = true;
}

async function isLockedOut(email: string): Promise<boolean> {
  try {
    const sql = getSql();
    await ensureAttemptsTable(sql);
    const rows = await sql`
      SELECT COUNT(*)::int AS n FROM login_attempts
      WHERE email = ${email} AND attempted_at > NOW() - make_interval(mins => ${LOCK_WINDOW_MINUTES})
    ` as { n: number }[];
    return (rows[0]?.n ?? 0) >= MAX_FAILED_LOGINS;
  } catch {
    return false;
  }
}

async function recordFailedLogin(email: string) {
  try {
    const sql = getSql();
    await ensureAttemptsTable(sql);
    await sql`INSERT INTO login_attempts (email) VALUES (${email})`;
  } catch {
    /* throttling is best-effort */
  }
}

async function clearFailedLogins(email: string) {
  try {
    await getSql()`DELETE FROM login_attempts WHERE email = ${email}`;
  } catch {
    /* ignore */
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const ipLimit = await consume(`login-ip:${clientIp(req)}`, 10, 60);
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSec);
    const parsed = await validateBody(req, z.object({
      email: z.string().max(254).optional(),
      password: z.string().max(256).optional(),
      mfaCode: z.string().max(32).optional(),
    }));
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email) return error('Email is required', 400);
    if (isPortfolioGuestEmail(email) && !isPortfolioGuestEnabled()) {
      return error('Invalid email or password', 401);
    }

    if (!password) {
      return error('Email and password are required', 400);
    }

    if (await isLockedOut(email)) {
      return error('Too many failed attempts. Try again in 15 minutes.', 429);
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
      // Fetch user: try join if user_roles exists, otherwise query users directly
      let users: DbUser[] = [];
      try {
        users = await sql`
          SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name,
                 COALESCE(r.name, u.role, 'viewer') AS role
          FROM users u
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles r ON r.id = ur.role_id
          WHERE lower(u.email) = ${email}
          LIMIT 1
        ` as DbUser[];
      } catch {
        users = await sql`
          SELECT id, tenant_id, email, first_name, last_name, role
          FROM users
          WHERE lower(email) = ${email}
          LIMIT 1
        ` as DbUser[];
      }
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

        if (userRecord.role === 'employee') {
          try {
            const empRows = await sql`
              SELECT id FROM employees
              WHERE tenant_id = ${u.tenant_id}
                AND (
                  lower(COALESCE(official_email, joining_email, email)) = ${email}
                  OR lower(email) = ${email}
                )
              LIMIT 1
            ` as { id: string }[];
            if (empRows.length > 0) {
              userRecord.employeeId = empRows[0].id;
            }
          } catch {
            /* ignore */
          }
        }

        // Query 'tenants' table first, fall back to legacy 'companies'
        let tenants: DbTenant[] = [];
        try {
          tenants = await sql`SELECT * FROM tenants WHERE id = ${u.tenant_id}` as DbTenant[];
        } catch {
          try {
            tenants = await sql`SELECT * FROM companies WHERE id = ${u.tenant_id}` as DbTenant[];
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

    // If tenantRecord not yet loaded (e.g. demo user), query organization from tenants table
    if (!tenantRecord && userRecord?.tenantId && userRecord.tenantId !== 'system') {
      try {
        const sql = getSql();
        const tRows = await sql`SELECT * FROM tenants WHERE id = ${userRecord.tenantId}` as DbTenant[];
        if (tRows.length > 0) {
          tenantRecord = mapTenant(tRows[0]);
        }
      } catch {
        /* ignore */
      }
    }

    const valid = userRecord ? await verifyPassword(email, password) : false;
    if (!valid) {
      await recordFailedLogin(email);
      return error('Invalid email or password', 401);
    }
    await clearFailedLogins(email);

    const mfa = await getMfaRecord(email);
    if (mfa?.enabled) {
      const mfaCode = String(body.mfaCode ?? '').trim();
      if (!mfaCode) return json({ mfaRequired: true });
      const mfaCheck = await verifyMfaWithLockout(email, mfa.secret, mfaCode);
      if (mfaCheck === 'locked') return error('Too many failed verification attempts. Try again in 15 minutes.', 429);
      if (mfaCheck !== 'ok') return error('Invalid verification code', 401);
    }

    let mustChange = false;
    try {
      const sql = getSql();
      const rows = await sql`SELECT must_change_password, password_hash FROM user_passwords WHERE lower(email) = ${email}` as { must_change_password: boolean; password_hash: string }[];
      if (rows.length > 0) {
        if (rows[0].must_change_password) mustChange = true;
      }
    } catch {
      // Ignore DB errors if column doesn't exist
    }

    if (!tenantRecord && userRecord) {
      tenantRecord = {
        id: userRecord.tenantId || '11111111-1111-1111-1111-111111111111',
        name: userRecord.role === 'platform_admin' ? 'Assetly Platform' : 'Solum Technologies',
        slug: userRecord.role === 'platform_admin' ? 'assetly' : 'solum-technologies',
        plan: 'Professional',
        enabledModules: ['module:assets', 'module:hr', 'module:docs', 'module:finance'],
      } as any;
    }

    if (!mfa?.enabled && (await isMfaEnforced(email, userRecord.tenantId))) {
      const pendingToken = await signAuthToken(userRecord, { mfaPending: true });
      return json({
        token: pendingToken,
        user: userRecord,
        tenant: tenantRecord,
        mfaEnrollRequired: true,
      });
    }

    const token = await signAuthToken(userRecord);
    const cookies = sessionCookies(token, await issueRefreshToken(userRecord.id));

    if (mustChange) {
      return json({
        token,
        user: userRecord,
        tenant: tenantRecord,
        requirePasswordSetup: true,
      }, 200, { cookies });
    }

    try {
      if (userRecord.role !== 'platform_admin') {
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
      }
    } catch {
      /* login should succeed even if audit log table is unavailable */
    }

    return json({
      token,
      user: userRecord,
      tenant: tenantRecord,
    }, 200, { cookies });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Login failed', 500);
  }
}
