import { neon } from '@neondatabase/serverless';
import { resolveAllowedOrigin } from './security';

/** Restrict to your production domain via ALLOWED_ORIGIN (or APP_URL). Defaults to * in local dev only. */
const ALLOWED_ORIGIN = resolveAllowedOrigin();

// ── SQL client helpers ────────────────────────────────────────────────────────

/** Returns the shared/platform SQL client (DATABASE_URL). */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

/**
 * Module-level cache: maps tenantId → Neon SQL client.
 * Vercel edge instances are long-lived, so this persists across requests on
 * the same instance and avoids repeated main-DB lookups.
 */
// Store as any to avoid generic variance issues across TypeScript versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tenantSqlCache = new Map<string, any>();

/**
 * Returns a SQL client scoped to the tenant's database.
 *
 * - If the tenant has a `database_url` in the tenants table (dedicated DB),
 *   queries go to that database exclusively.
 * - Otherwise falls back to the shared DATABASE_URL.
 *
 * Result is cached per tenant per edge instance.
 */
// Return as any to sidestep NeonQueryFunction<false,false> vs <boolean,boolean>
// generic variance strictness in TypeScript 5.9+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTenantSql(tenantId: string): Promise<any> {
  const cached = tenantSqlCache.get(tenantId);
  if (cached) return cached;

  const mainSql = getSql();
  try {
    const rows = await mainSql`
      SELECT database_url FROM tenants WHERE id = ${tenantId} LIMIT 1
    ` as { database_url: string | null }[];

    const url = rows[0]?.database_url ?? process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not configured');

    const sql = neon(url);
    tenantSqlCache.set(tenantId, sql);
    return sql;
  } catch {
    // Fallback to shared DB (e.g. tenants table not yet created)
    const sql = getSql();
    tenantSqlCache.set(tenantId, sql);
    return sql;
  }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Token',
    },
  });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Token',
    },
  });
}

export async function parseBody<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}
