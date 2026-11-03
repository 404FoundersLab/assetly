import { getSql, json, error } from './db';
import { sha256Hex, randomToken } from './crypto';
import { isProductionRuntime } from './security';
import { ACCESS_TOKEN_TTL_SEC, SESSION_COOKIE, readCookie, signAuthToken, type AuthUser } from './auth';

export const REFRESH_COOKIE = 'assetly_refresh';
export const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id)`;
  tableReady = true;
}

function cookie(name: string, value: string, maxAge: number, path: string): string {
  const secure = isProductionRuntime() ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly${secure}; SameSite=Strict; Path=${path}; Max-Age=${maxAge}`;
}

export function sessionCookies(accessToken: string, refreshToken: string): string[] {
  return [
    cookie(SESSION_COOKIE, accessToken, ACCESS_TOKEN_TTL_SEC, '/'),
    cookie(REFRESH_COOKIE, refreshToken, REFRESH_TTL_SEC, '/api/auth'),
  ];
}

export function clearedCookies(): string[] {
  return [cookie(SESSION_COOKIE, '', 0, '/'), cookie(REFRESH_COOKIE, '', 0, '/api/auth')];
}

/** Creates a refresh token (new family unless one is supplied). Only a SHA-256 digest is stored. */
export async function issueRefreshToken(userId: string, familyId?: string): Promise<string> {
  await ensureTable();
  const token = randomToken(48);
  const sql = getSql();
  await sql`
    INSERT INTO auth_refresh_tokens (family_id, user_id, token_hash, expires_at)
    VALUES (
      ${familyId ?? crypto.randomUUID()},
      ${userId},
      ${await sha256Hex(token)},
      NOW() + make_interval(secs => ${REFRESH_TTL_SEC})
    )
  `;
  return token;
}

export async function revokeAllForUser(userId: string): Promise<void> {
  try {
    await ensureTable();
    await getSql()`UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE user_id = ${userId} AND revoked_at IS NULL`;
  } catch {
    /* best effort */
  }
}

export async function revokeByToken(token: string): Promise<void> {
  try {
    await ensureTable();
    await getSql()`UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE token_hash = ${await sha256Hex(token)} AND revoked_at IS NULL`;
  } catch {
    /* best effort */
  }
}

type DbUserRow = {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: string;
};

async function loadUser(userId: string): Promise<Parameters<typeof signAuthToken>[0] | null> {
  const sql = getSql();
  let rows: DbUserRow[];
  try {
    rows = (await sql`
      SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name,
             COALESCE(r.name, u.role, 'viewer') AS role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ${userId} LIMIT 1
    `) as DbUserRow[];
  } catch {
    rows = (await sql`
      SELECT id, tenant_id, email, first_name, last_name, role FROM users WHERE id = ${userId} LIMIT 1
    `) as DbUserRow[];
  }
  if (rows.length === 0) return null;
  const u = rows[0];
  const user: Parameters<typeof signAuthToken>[0] = {
    id: u.id,
    tenantId: u.tenant_id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name || '',
    role: u.role,
  };
  if (u.role === 'employee') {
    try {
      const emp = (await sql`
        SELECT id FROM employees
        WHERE tenant_id = ${u.tenant_id} AND lower(email) = ${u.email.toLowerCase()} LIMIT 1
      `) as { id: string }[];
      if (emp[0]) user.employeeId = emp[0].id;
    } catch {
      /* optional */
    }
  }
  return user;
}

/** Rotates the refresh token. Presenting an already-used token revokes the whole family (theft detection). */
export async function rotateRefreshToken(req: Request): Promise<Response> {
  const presented = readCookie(req, REFRESH_COOKIE);
  if (!presented) return error('Unauthorized', 401);
  await ensureTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, family_id, user_id, expires_at, revoked_at FROM auth_refresh_tokens
    WHERE token_hash = ${await sha256Hex(presented)} LIMIT 1
  `) as { id: string; family_id: string; user_id: string; expires_at: string; revoked_at: string | null }[];
  const row = rows[0];
  const reject = () => {
    const res = json({ error: 'Unauthorized' }, 401, { cookies: clearedCookies() });
    return res;
  };
  if (!row) return reject();
  if (row.revoked_at) {
    await sql`UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE family_id = ${row.family_id} AND revoked_at IS NULL`;
    return reject();
  }
  if (new Date(row.expires_at).getTime() < Date.now()) return reject();

  const user = await loadUser(row.user_id);
  if (!user) return reject();

  await sql`UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE id = ${row.id}`;
  const access = await signAuthToken(user);
  const refresh = await issueRefreshToken(row.user_id, row.family_id);
  return json({ token: access, user }, 200, { cookies: sessionCookies(access, refresh) });
}

export type { AuthUser };
