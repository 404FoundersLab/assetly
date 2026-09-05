import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getSql, error } from './db';
import { DEMO_USERS } from './demo-users';
import { getJwtSecretKey, isDemoAuthEnabled } from './security';
import { isPortfolioGuestEmail, isReadOnlyRole, matchPortfolioGuest } from './portfolio-guest';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2v1:';

const secret = () => getJwtSecretKey();

export interface AuthUser extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  employeeId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${PBKDF2_PREFIX}${saltHex}:${hashHex}`;
}

async function verifyPbkdf2Hash(password: string, stored: string): Promise<boolean> {
  const inner = stored.slice(PBKDF2_PREFIX.length);
  const colonIdx = inner.indexOf(':');
  if (colonIdx === -1) return false;
  const saltHex = inner.slice(0, colonIdx);
  const expectedHex = inner.slice(colonIdx + 1);
  const saltBytes = new Uint8Array(
    (saltHex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)),
  );
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === expectedHex;
}

async function legacySha256Hash(password: string): Promise<string> {
  const pepper = process.env.JWT_SECRET || 'assetly-dev-secret-change-in-production';
  const data = new TextEncoder().encode(`${password}:${pepper}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

function matchDemoPassword(email: string, password: string): boolean {
  if (!isDemoAuthEnabled()) return false;
  const cred = DEMO_USERS[email.toLowerCase()];
  return Boolean(cred && cred.password === password);
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  if (isPortfolioGuestEmail(normalized)) {
    return matchPortfolioGuest(normalized, password);
  }
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT password_hash FROM user_passwords WHERE email = ${normalized}
    ` as { password_hash: string }[];

    if (rows.length > 0) {
      const stored = rows[0].password_hash;
      if (stored === 'optional-on-first-login') {
        return true;
      }
      if (stored === 'seed-placeholder') {
        if (matchDemoPassword(normalized, password)) {
          try {
            const hash = await hashPassword(password);
            await sql`
              UPDATE user_passwords
              SET password_hash = ${hash}, updated_at = NOW()
              WHERE email = ${normalized}
            `;
          } catch {
            // Ignore DB errors on upgrade
          }
          return true;
        }
        return false;
      }
      if (stored.startsWith(PBKDF2_PREFIX)) {
        return verifyPbkdf2Hash(password, stored);
      }
      // Legacy SHA-256 hash — auto-upgrade on next password change
      return (await legacySha256Hash(password)) === stored;
    }
  } catch {
    /* user_passwords table may not exist yet — fall back to demo credentials when enabled */
  }

  if (matchPortfolioGuest(normalized, password)) return true;
  return matchDemoPassword(normalized, password);
}

export async function signAuthToken(user: {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  employeeId?: string;
}): Promise<string> {
  const isGuest = isPortfolioGuestEmail(user.email);
  return new SignJWT({
    email: user.email,
    role: isGuest ? 'viewer' : user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    ...(user.tenantId ? { tenantId: user.tenantId } : {}),
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(isGuest ? '4h' : '8h')
    .sign(secret());
}

export async function verifyAuthToken(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), secret());
    return payload as AuthUser;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request): Promise<AuthUser | Response> {
  const user = await verifyAuthToken(req);
  if (!user?.sub) return error('Unauthorized', 401);
  if (isPortfolioGuestEmail(user.email)) {
    user.role = 'viewer';
  }
  if (isReadOnlyRole(user.role)) {
    const method = req.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      return error('This account is read-only', 403);
    }
  }
  return user;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Tenant ID used for billing APIs — platform admins fall back to the demo tenant. */
export function resolveBillingTenantId(auth: AuthUser): string | null {
  if (auth.tenantId && isUuid(auth.tenantId)) return auth.tenantId;
  return null;
}

export function canManageBilling(role: string | undefined): boolean {
  return role === 'tenant_admin' || role === 'platform_admin';
}

export function canReviewRequests(role: string | undefined): boolean {
  return role === 'tenant_admin' || role === 'it_admin' || role === 'platform_admin';
}

export function canManageEndpoints(role: string | undefined): boolean {
  return role === 'tenant_admin' || role === 'it_admin' || role === 'platform_admin';
}

export function canManageHrLeave(role: string | undefined): boolean {
  return role === 'tenant_admin' || role === 'hr_admin' || role === 'platform_admin';
}

export function canSearchAssets(role: string | undefined): boolean {
  return (
    role === 'tenant_admin' ||
    role === 'it_admin' ||
    role === 'platform_admin' ||
    role === 'finance_admin' ||
    role === 'viewer'
  );
}

export function isPublicApiRoute(pathname: string, method: string): boolean {
  if (pathname === '/api/health') return true;
  if (pathname === '/api/auth/demo-status' && method === 'GET') return true;
  if (pathname === '/api/billing/webhooks' && method === 'POST') return true;
  if (pathname === '/api/billing/webhooks-razorpay' && method === 'POST') return true;
  if (pathname === '/api/auth/login' && method === 'POST') return true;
  if (method === 'GET' && /^\/api\/assets\/[^/]+$/.test(pathname)) {
    const segment = pathname.split('/').pop();
    if (segment && segment !== 'import') return true;
  }
  return false;
}

export async function insertAuditLog(
  audit: {
    tenantId?: string;
    userId?: string;
    userName?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    entityLabel?: string;
    details?: string;
  },
): Promise<void> {
  try {
    const sql = getSql();
    const tenantId = audit.tenantId;
    if (!tenantId) return; // Silent return if no tenant id since we can't log it
    await sql`
      INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id, entity_label, details)
      VALUES (
        ${tenantId},
        ${audit.userId ?? null},
        ${audit.userName ?? null},
        ${audit.action},
        ${audit.entityType ?? null},
        ${audit.entityId ?? null},
        ${audit.entityLabel ?? null},
        ${audit.details ?? null}
      )
    `;
  } catch {
    // Non-blocking: audit log errors should never prevent user operations
  }
}
