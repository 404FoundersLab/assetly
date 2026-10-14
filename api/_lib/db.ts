import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import { resolveAllowedOrigin } from './security';

const { Pool } = pg;

/** Restrict to your production domain via ALLOWED_ORIGIN (or APP_URL). Defaults to * in local dev only. */
const ALLOWED_ORIGIN = resolveAllowedOrigin();

// ── SQL client helpers ────────────────────────────────────────────────────────

// Module-level caches
const pgPoolCache = new Map<string, pg.Pool>();
const tenantSqlCache = new Map<string, any>();

function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech');
}

/**
 * Creates a SQL client compatible with neon(...) tagged templates and function calls.
 * If connecting to Neon, uses @neondatabase/serverless.
 * If connecting to standard PostgreSQL (on-prem / Docker / local), uses pg.Pool.
 */
export function createSqlClient(url: string): any {
  if (isNeonUrl(url)) {
    return neon(url);
  }

  let pool = pgPoolCache.get(url);
  if (!pool) {
    pool = new Pool({ connectionString: url });
    pgPoolCache.set(url, pool);
  }

  const activePool = pool;

  return async function sql(stringsOrQuery: TemplateStringsArray | string, ...values: any[]) {
    if (typeof stringsOrQuery === 'string') {
      const params = Array.isArray(values[0]) ? values[0] : values;
      const res = await activePool.query(stringsOrQuery, params);
      return res.rows;
    }

    let text = '';
    const params: any[] = [];
    for (let i = 0; i < stringsOrQuery.length; i++) {
      text += stringsOrQuery[i];
      if (i < values.length) {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    }

    const res = await activePool.query(text, params);
    return res.rows;
  };
}

/** Returns the shared/platform SQL client (DATABASE_URL). */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return createSqlClient(url);
}

/**
 * Module-level cache: maps tenantId → SQL client.
 * Persists across requests on long-lived instances.
 */

/**
 * Returns a SQL client scoped to the tenant's database.
 *
 * - If the tenant has a `database_url` in the tenants table (dedicated DB),
 *   queries go to that database exclusively.
 * - Otherwise falls back to the shared DATABASE_URL.
 */
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

    const sql = createSqlClient(url);
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
