/** Runtime / feature-flag helpers for production hardening. */

const DEV_JWT_FALLBACK = 'assetly-dev-secret-change-in-production';
const WEAK_JWT_PLACEHOLDERS = new Set([
  DEV_JWT_FALLBACK,
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

/** Hardcoded demo accounts (Demo@123456) — enable only for local/portfolio demos. */
export function isDemoAuthEnabled(): boolean {
  return process.env.DEMO_AUTH_ENABLED === 'true';
}

/** Instant plan upgrades without Stripe/Razorpay — never on by default in production. */
export function isBillingDemoModeEnabled(): boolean {
  if (process.env.BILLING_DEMO_MODE === 'true') return true;
  if (process.env.BILLING_DEMO_MODE === 'false') return false;
  return !isProductionRuntime();
}

export function resolveAllowedOrigin(): string {
  const configured = process.env.ALLOWED_ORIGIN?.trim();
  if (configured) return configured;
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, '');
  if (isProductionRuntime()) {
    // Fail closed for browsers — do not reflect *
    return 'null';
  }
  return '*';
}

export function getJwtSecretKey(): Uint8Array {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || WEAK_JWT_PLACEHOLDERS.has(value)) {
    if (isProductionRuntime()) {
      throw new Error('JWT_SECRET must be set to a strong secret in production');
    }
    return new TextEncoder().encode(value || DEV_JWT_FALLBACK);
  }
  return new TextEncoder().encode(value);
}

/**
 * Agent registration/telemetry auth.
 * Returns an error Response when unauthorized; null when allowed.
 */
export function assertAgentAuthorized(
  req: Request,
  errorFn: (message: string, status?: number) => Response,
): Response | null {
  const secret = process.env.AGENT_SECRET?.trim();
  if (!secret || WEAK_JWT_PLACEHOLDERS.has(secret)) {
    return null;
  }
  const token = req.headers.get('X-Agent-Token');
  if (token && token !== secret) {
    return errorFn('Unauthorized agent token', 401);
  }
  return null;
}
