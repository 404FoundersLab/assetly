/** Runtime / feature-flag helpers for production hardening. */

const WEAK_JWT_PLACEHOLDERS = new Set([
  'assetly-dev-secret-change-in-production',
  'change-me-in-production',
  'changeme',
  'secret',
]);

/** True on Vercel production or when NODE_ENV=production. */
export function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') return false;
  return process.env.NODE_ENV === 'production';
}

/** Hardcoded demo accounts (Demo@123456) — enable for local/portfolio demos. */
export function isDemoAuthEnabled(): boolean {
  return process.env.DEMO_AUTH_ENABLED === 'true';
}

/** Instant plan upgrades without Stripe/Razorpay — never on by default in production. */
export function isBillingDemoModeEnabled(): boolean {
  return process.env.BILLING_DEMO_MODE === 'true';
}

/** Allowed browser origins (comma-separated ALLOWED_ORIGIN / APP_URL). Never a wildcard. */
export function resolveAllowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGIN ?? process.env.APP_URL ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter((o) => o && o !== '*');
  if (configured.length > 0) return configured;
  return isProductionRuntime() ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

/** Single origin echoed in CORS headers. Empty allowlist (misconfigured prod) fails closed with 'null'. */
export function resolveAllowedOrigin(requestOrigin?: string | null): string {
  const allowed = resolveAllowedOrigins();
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  return allowed[0] ?? 'null';
}

export const MIN_SECRET_BYTES = 32;

function secretProblem(name: string, value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return `${name} is not set`;
  if (WEAK_JWT_PLACEHOLDERS.has(v)) return `${name} is a known placeholder value`;
  if (new TextEncoder().encode(v).length < MIN_SECRET_BYTES) return `${name} must be at least ${MIN_SECRET_BYTES} bytes`;
  return null;
}

/** Fails fast (throws) when mandatory secrets are missing, default or too short. */
export function assertSecurityConfig(): void {
  const problems = [secretProblem('JWT_SECRET', process.env.JWT_SECRET), secretProblem('APP_ENCRYPTION_KEY', process.env.APP_ENCRYPTION_KEY)].filter(Boolean);
  if (problems.length > 0) throw new Error(`Insecure configuration: ${problems.join('; ')}`);
}

export function getJwtSecretKey(): Uint8Array {
  const problem = secretProblem('JWT_SECRET', process.env.JWT_SECRET);
  if (problem) throw new Error(`Insecure configuration: ${problem}`);
  return new TextEncoder().encode(process.env.JWT_SECRET!.trim());
}

/** Client IP as set by the hosting proxy (Vercel overwrites x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-store',
};

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * Agent registration/telemetry auth.
 * Returns an error Response when unauthorized; null when allowed.
 * A matching X-Agent-Token is mandatory whenever AGENT_SECRET is set; in production AGENT_SECRET is required.
 */
export function assertAgentAuthorized(
  req: Request,
  errorFn: (message: string, status?: number) => Response,
): Response | null {
  const secret = process.env.AGENT_SECRET?.trim();
  if (!secret || WEAK_JWT_PLACEHOLDERS.has(secret) || (isProductionRuntime() && secret.length < MIN_SECRET_BYTES)) {
    if (isProductionRuntime()) return errorFn('Agent authentication is not configured', 503);
    return null;
  }
  const token = req.headers.get('X-Agent-Token') ?? '';
  if (!timingSafeEqual(token, secret)) {
    return errorFn('Unauthorized agent token', 401);
  }
  return null;
}