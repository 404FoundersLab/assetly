import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getSql, getTenantSql, error } from './db';
import { DEMO_USERS } from './demo-users';
import { getJwtSecretKey, clientIp, isDemoAuthEnabled, isProductionRuntime, resolveAllowedOrigins, timingSafeEqual } from './security';
import { memoryLimit, tooManyRequests } from './ratelimit';
import { isPortfolioGuestEmail, isReadOnlyRole, matchPortfolioGuest } from './portfolio-guest';

const PBKDF2_V1_ITERATIONS = 100_000;
const PBKDF2_V1_PREFIX = 'pbkdf2v1:';
/** OWASP-recommended minimum for PBKDF2-HMAC-SHA512. Overridable (higher) via PBKDF2_ITERATIONS. */
const PBKDF2_V2_ITERATIONS = Math.max(210_000, Number(process.env.PBKDF2_ITERATIONS) || 0);
const PBKDF2_V2_PREFIX = 'pbkdf2v2:';

export const JWT_ISSUER = 'assetly';
export const JWT_AUDIENCE = 'assetly-app';
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const SESSION_COOKIE = 'assetly_session';

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

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

async function derive(password: string, salt: BufferSource, iterations: number, hash: 'SHA-256' | 'SHA-512', bits: number) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash, salt, iterations }, keyMaterial, bits));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = toHex(salt.buffer as ArrayBuffer);
  const hashHex = await derive(password, salt, PBKDF2_V2_ITERATIONS, 'SHA-512', 512);
  return `${PBKDF2_V2_PREFIX}${PBKDF2_V2_ITERATIONS}:${saltHex}:${hashHex}`;
}

function hexToBytes(hex: string): BufferSource {
  return new Uint8Array((hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16))) as unknown as BufferSource;
}

async function verifyPbkdf2V2(password: string, stored: string): Promise<boolean> {
  const [iterStr, saltHex, expectedHex] = stored.slice(PBKDF2_V2_PREFIX.length).split(':');
  const iterations = Number(iterStr);
  if (!iterations || iterations > 5_000_000 || !saltHex || !expectedHex) return false;
  return timingSafeEqual(await derive(password, hexToBytes(saltHex), iterations, 'SHA-512', 512), expectedHex);
}

async function verifyPbkdf2V1(password: string, stored: string): Promise<boolean> {
  const inner = stored.slice(PBKDF2_V1_PREFIX.length);
  const colonIdx = inner.indexOf(':');
  if (colonIdx === -1) return false;
  const expectedHex = inner.slice(colonIdx + 1);
  return timingSafeEqual(await derive(password, hexToBytes(inner.slice(0, colonIdx)), PBKDF2_V1_ITERATIONS, 'SHA-256', 256), expectedHex);
}

async function legacySha256Hash(password: string): Promise<string> {
  const pepper = process.env.JWT_SECRET;
  if (!pepper) return '';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${password}:${pepper}`));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/** Transparently upgrades weaker stored hashes after a successful verification. */
async function rehashIfNeeded(email: string, password: string, stored: string): Promise<void> {
  if (stored.startsWith(PBKDF2_V2_PREFIX) && Number(stored.split(':')[1]) >= PBKDF2_V2_ITERATIONS) return;
  try {
    const hash = await hashPassword(password);
    await getSql()`UPDATE user_passwords SET password_hash = ${hash}, updated_at = NOW() WHERE email = ${email}`;
  } catch {
    /* upgrade is best-effort */
  }
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
        // Legacy passwordless placeholder: never valid. An admin must reset the password.
        return false;
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
      let ok: boolean;
      if (stored.startsWith(PBKDF2_V2_PREFIX)) ok = await verifyPbkdf2V2(password, stored);
      else if (stored.startsWith(PBKDF2_V1_PREFIX)) ok = await verifyPbkdf2V1(password, stored);
      else ok = timingSafeEqual(await legacySha256Hash(password), stored);
      if (ok) await rehashIfNeeded(normalized, password, stored);
      return ok;
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
}, opts?: { mfaPending?: boolean }): Promise<string> {
  const isGuest = isPortfolioGuestEmail(user.email);
  return new SignJWT({
    email: user.email,
    role: isGuest ? 'viewer' : user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    ...(user.tenantId ? { tenantId: user.tenantId } : {}),
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
    ...(opts?.mfaPending ? { mfaPending: true } : {}),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(opts?.mfaPending ? '15m' : isGuest ? '1h' : `${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(secret());
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('Cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** Tokens issued while MFA enrollment is pending are rejected unless `allowMfaPending` is set. */
export async function verifyAuthToken(
  req: Request,
  allowMfaPending = false,
): Promise<AuthUser | null> {
  const header = req.headers.get('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (payload.mfaPending && !allowMfaPending) return null;
    return payload as AuthUser;
  } catch {
    return null;
  }
}

/** CSRF defence for cookie-authenticated unsafe requests: same-site Origin plus a custom header. */
function csrfViolation(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  if (req.headers.get('Authorization')?.startsWith('Bearer ')) return false;
  const origin = req.headers.get('Origin');
  if (origin && !resolveAllowedOrigins().includes(origin) && origin !== new URL(req.url).origin) return true;
  return req.headers.get('X-Requested-With') !== 'XMLHttpRequest';
}

const accountCache = new Map<string, { ok: boolean; at: number }>();
const ACCOUNT_CACHE_MS = 30_000;

export function clearAccountCache(): void {
  accountCache.clear();
}

/** The account must still exist, and its tenant must be active. Fails closed on DB errors in production. */
async function isAccountActive(user: AuthUser): Promise<boolean> {
  if (isPortfolioGuestEmail(user.email) || !user.tenantId || !isUuid(user.tenantId)) return true;
  const key = `${user.sub}:${user.tenantId}`;
  const hit = accountCache.get(key);
  if (hit && Date.now() - hit.at < ACCOUNT_CACHE_MS) return hit.ok;
  let ok: boolean;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id FROM users WHERE id = ${user.sub} AND tenant_id = ${user.tenantId} LIMIT 1
    `) as unknown[];
    ok = rows.length > 0;
    if (!ok && isDemoAuthEnabled() && DEMO_USERS[user.email.toLowerCase()]) {
      accountCache.set(key, { ok: true, at: Date.now() });
      return true;
    }
    if (ok) {      try {
        const t = (await sql`SELECT status FROM tenants WHERE id = ${user.tenantId} LIMIT 1`) as { status?: string }[];
        if (t.length === 0) ok = false;
        else if (['suspended', 'inactive', 'disabled', 'deleted'].includes(String(t[0].status ?? '').toLowerCase())) ok = false;
      } catch {
        /* tenants.status may not exist */
      }
    }
  } catch {
    ok = !isProductionRuntime();
  }
  accountCache.set(key, { ok, at: Date.now() });
  return ok;
}

export async function requireAuth(
  req: Request,
  opts?: { allowMfaPending?: boolean },
): Promise<AuthUser | Response> {
  const user = await verifyAuthToken(req, opts?.allowMfaPending);
  if (!user?.sub) return error('Unauthorized', 401);
  if (csrfViolation(req)) return error('Forbidden', 403);
  const general = memoryLimit(`api:${clientIp(req)}:${user.sub}`, Number(process.env.API_RATE_LIMIT_PER_MIN) || 300, 60_000);
  if (!general.allowed) return tooManyRequests(general.retryAfterSec);
  if (!(await isAccountActive(user))) return error('Unauthorized', 401);

  if (isPortfolioGuestEmail(user.email)) {
    user.role = 'viewer';
  }
  if (isReadOnlyRole(user.role)) {
    const method = req.method.toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      return error('This account is read-only', 403);
    }
  }
  const denied = enforceWriteRbac(req, user.role);
  if (denied) return denied;
  return user;
}

const ADMIN_WRITE_ROLES = ['platform_admin', 'tenant_admin', 'it_admin', 'finance_admin'];
const PEOPLE_WRITE_ROLES = ['platform_admin', 'tenant_admin', 'hr_admin', 'it_admin'];

/** Central role gate for mutating requests on core inventory/people routes. */
function enforceWriteRbac(req: Request, role: string): Response | null {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
  const path = new URL(req.url).pathname;
  let allowed: string[] | null = null;
  if (/^\/api\/(assets|asset-categories|vendors)(\/|$)/.test(path)) allowed = ADMIN_WRITE_ROLES;
  else if (/^\/api\/(employees|departments)(\/|$)/.test(path)) allowed = PEOPLE_WRITE_ROLES;
  if (allowed && !allowed.includes(role)) return error('Forbidden', 403);
  return null;
}

export function canManageAssets(role: string | undefined): boolean {
  return ADMIN_WRITE_ROLES.includes(role ?? '');
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

export function canReviewApprovals(role: string | undefined): boolean {
  return role === 'tenant_admin' || role === 'manager' || role === 'hr_admin' || role === 'it_admin' || role === 'finance_admin' || role === 'platform_admin';
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
  if (pathname === '/api/auth/refresh' && method === 'POST') return true;
  if (pathname === '/api/auth/logout' && method === 'POST') return true;
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
    const tenantId = audit.tenantId;
    if (!tenantId) return;
    const sql = await getTenantSql(tenantId);
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

const TEMP_PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Cryptographically random one-time password (meets typical complexity rules). */
export function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  const body = Array.from(bytes, (b) => TEMP_PW_ALPHABET[b % TEMP_PW_ALPHABET.length]).join('');
  return `Tmp-${body}-7a`;
}
