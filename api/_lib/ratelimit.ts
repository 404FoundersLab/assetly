import { getSql, json } from './db';

/**
 * Sliding-window counters. Auth-sensitive limits are persisted in the database so they hold across
 * stateless serverless instances; the general API limiter is per-instance (best effort).
 */

let tableReady = false;

async function ensureTable(sql: ReturnType<typeof getSql>) {
  if (tableReady) return;
  await sql`CREATE TABLE IF NOT EXISTS rate_limits (
    bucket TEXT NOT NULL,
    hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON rate_limits(bucket, hit_at)`;
  tableReady = true;
}

export async function hitsInWindow(bucket: string, windowSec: number): Promise<number> {
  const sql = getSql();
  await ensureTable(sql);
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM rate_limits
    WHERE bucket = ${bucket} AND hit_at > NOW() - make_interval(secs => ${windowSec})
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export async function recordHit(bucket: string): Promise<void> {
  const sql = getSql();
  await ensureTable(sql);
  await sql`INSERT INTO rate_limits (bucket) VALUES (${bucket})`;
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limits WHERE hit_at < NOW() - INTERVAL '1 day'`;
  }
}

export async function clearBucket(bucket: string): Promise<void> {
  const sql = getSql();
  await ensureTable(sql);
  await sql`DELETE FROM rate_limits WHERE bucket = ${bucket}`;
}

export interface LimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

/** Counts this attempt and reports whether it is within `max` per `windowSec`. Fails closed on storage errors. */
export async function consume(bucket: string, max: number, windowSec: number): Promise<LimitResult> {
  try {
    const used = await hitsInWindow(bucket, windowSec);
    if (used >= max) return { allowed: false, retryAfterSec: windowSec };
    await recordHit(bucket);
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: false, retryAfterSec: 30 };
  }
}

/** True when `max` failures have been recorded in the window (used for lockouts). */
export async function isLocked(bucket: string, max: number, windowSec: number): Promise<boolean> {
  try {
    return (await hitsInWindow(bucket, windowSec)) >= max;
  } catch {
    return true;
  }
}

export function tooManyRequests(retryAfterSec = 60): Response {
  const res = json({ error: 'Too many requests. Please try again later.' }, 429);
  res.headers.set('Retry-After', String(retryAfterSec));
  return res;
}

// ── Per-instance limiter for general API traffic ─────────────────────────────

const memory = new Map<string, number[]>();

export function memoryLimit(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    memory.set(key, hits);
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  memory.set(key, hits);
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.every((t) => now - t >= windowMs)) memory.delete(k);
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function __resetMemoryLimits() {
  memory.clear();
}
