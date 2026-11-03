import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
  SECURITY_HEADERS,
  assertSecurityConfig,
  isProductionRuntime,
  resolveAllowedOrigin,
} from './security';

// Fail fast at cold start in production when mandatory secrets are missing/weak.
if (isProductionRuntime()) assertSecurityConfig();

// Ã¢â€â‚¬Ã¢â€â‚¬ Test hook (only usable when NODE_ENV=test) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let testSql: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function __setTestSql(fn: any) {
  if (process.env.NODE_ENV !== 'test') throw new Error('__setTestSql is only available in tests');
  testSql = fn;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ SQL client helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** Returns the shared/platform SQL client (DATABASE_URL). */
export function getSql() {
  if (testSql) return testSql as NeonQueryFunction<false, false>;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tenantSqlCache = new Map<string, any>();

/**
 * Returns a SQL client for the tenant's database (dedicated DB when configured, else shared).
 * Fails closed: an unresolvable tenant never silently falls back.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTenantSql(tenantId: string): Promise<any> {
  if (testSql) return testSql;
  const cached = tenantSqlCache.get(tenantId);
  if (cached) return cached;

  const mainSql = getSql();
  const rows = (await mainSql`
    SELECT database_url FROM tenants WHERE id = ${tenantId} LIMIT 1
  `) as { database_url: string | null }[];
  if (rows.length === 0) throw new Error('Tenant not found');

  const url = rows[0].database_url ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');

  const sql = neon(url);
  tenantSqlCache.set(tenantId, sql);
  return sql;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Redaction Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const SENSITIVE_KEYS = new Set([
  'password_hash',
  'passwordhash',
  'database_url',
  'databaseurl',
  'totp_secret',
  'token_hash',
]);

/** Strips credentials/hashes from any JSON payload before it leaves the API. */
export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) continue;
    out[k] = redactDeep(v, depth + 1);
  }
  return out;
}

/** Removes secrets from free-form text destined for logs. */
export function redactText(text: string): string {
  return String(text)
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted-jwt]')
    .replace(/Bearer\s+[\w.~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/pbkdf2v\d:[^\s"']+/g, '[redacted-hash]')
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[redacted-connection-string]')
    .replace(/(password|secret|token|api[_-]?key)(["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1$2[redacted]');
}

export function correlationId(): string {
  return crypto.randomUUID();
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Responses Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Token, X-Requested-With',
    Vary: 'Origin',
  };
}

export function json(data: unknown, status = 200, opts?: { cookies?: string[] }) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS,
    ...corsHeaders(),
  });
  for (const c of opts?.cookies ?? []) headers.append('Set-Cookie', c);
  return new Response(JSON.stringify(redactDeep(data)), { status, headers });
}

const KNOWN_CLIENT_ERRORS: Record<string, number> = {
  'Payload too large': 413,
  'Invalid JSON body': 400,
};

/** Validation failures thrown from parseValidated carry this prefix and are always client errors. */
function isValidationMessage(message: string): boolean {
  return message.startsWith('Invalid request:');
}

export function error(message: string, status = 400) {
  if (status >= 500) {
    const known = KNOWN_CLIENT_ERRORS[message];
    if (known) return json({ error: message }, known);
    if (/violates check constraint|invalid input value for enum/i.test(message)) {
      return json({ error: 'Invalid value for one of the fields' }, 400);
    }
    if (/invalid input syntax for type uuid/i.test(message)) {
      return json({ error: 'Invalid identifier' }, 400);
    }
    if (isValidationMessage(message)) return json({ error: message.slice(0, 300) }, 400);
    // Config-problem messages name the variable only (never its value), so operators can self-diagnose.
    if (/^Insecure configuration: [A-Z_]+ (is not set|is a known placeholder value|must be at least \d+ bytes)/.test(message)) {
      console.error(JSON.stringify({ level: 'error', status: 503, message }));
      return json({ error: message }, 503);
    }
    const id = correlationId();
    console.error(JSON.stringify({ level: 'error', correlationId: id, status, message: redactText(message) }));
    return json(
      { error: isProductionRuntime() ? 'Internal server error' : redactText(message), correlationId: id },
      status,
    );
  }
  return json({ error: message }, status);
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: { ...SECURITY_HEADERS, ...corsHeaders(), 'Access-Control-Max-Age': '600' },
  });
}

export const MAX_JSON_BYTES = 1_000_000;
export const MAX_UPLOAD_BYTES = 10_000_000;

/** Reads a JSON body with a hard size cap. Empty body yields {}. */
export async function parseBody<T>(req: Request, maxBytes = MAX_JSON_BYTES): Promise<T> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new Error('Payload too large');
  const text = await req.text();
  if (text.length > maxBytes) throw new Error('Payload too large');
  if (!text.trim()) return {} as T;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON body');
  }
  assertSafeStructure(parsed, 0);
  return parsed as T;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Rejects prototype-pollution keys, runaway nesting and oversized arrays before any handler sees the data. */
function assertSafeStructure(value: unknown, depth: number): void {
  if (value === null || typeof value !== 'object') return;
  if (depth > 12) throw new Error('Invalid request: body nesting too deep');
  if (Array.isArray(value)) {
    if (value.length > 20_000) throw new Error('Invalid request: array too large');
    for (const v of value) assertSafeStructure(v, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(k)) throw new Error('Invalid request: forbidden property');
    assertSafeStructure(v, depth + 1);
  }
}
