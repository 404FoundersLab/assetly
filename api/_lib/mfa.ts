import { getSql } from './db';

/** TOTP (RFC 6238) helpers using Web Crypto — works in the edge runtime. */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateSecret(bytes = 20): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32');
    bits += idx.toString(2).padStart(5, '0');
  }
  const out = new Uint8Array(new ArrayBuffer(Math.floor(bits.length / 8)));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const offset = h[h.length - 1] & 0x0f;
  const code =
    ((h[offset] & 0x7f) << 24) |
    (h[offset + 1] << 16) |
    (h[offset + 2] << 8) |
    h[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Accepts the current code plus/minus one 30s step for clock drift. */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const normalized = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (const drift of [0, -1, 1]) {
    if ((await hotp(secret, counter + drift)) === normalized) return true;
  }
  return false;
}

export function buildOtpAuthUri(email: string, secret: string, issuer = 'Assetly'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

let tableReady = false;
export async function ensureMfaTable(): Promise<void> {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS user_mfa (
      email VARCHAR(255) PRIMARY KEY,
      secret VARCHAR(128) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  tableReady = true;
}

let policyReady = false;
export async function ensureMfaPolicyTables(): Promise<void> {
  if (policyReady) return;
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS mfa_enforced_tenants (
    tenant_id VARCHAR(64) PRIMARY KEY,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS mfa_enforced_users (
    email VARCHAR(255) PRIMARY KEY,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  policyReady = true;
}

/** True when a platform admin requires MFA for this user (directly or via their organization). */
export async function isMfaEnforced(email: string, tenantId?: string): Promise<boolean> {
  try {
    await ensureMfaPolicyTables();
    const sql = getSql();
    const u = (await sql`
      SELECT 1 FROM mfa_enforced_users WHERE email = ${email.toLowerCase()} LIMIT 1
    `) as unknown[];
    if (u.length > 0) return true;
    if (tenantId) {
      const t = (await sql`
        SELECT 1 FROM mfa_enforced_tenants WHERE tenant_id = ${tenantId} LIMIT 1
      `) as unknown[];
      if (t.length > 0) return true;
    }
  } catch {
    /* policy tables unavailable — treat as not enforced */
  }
  return false;
}

export async function getMfaRecord(
  email: string,
): Promise<{ secret: string; enabled: boolean } | null> {
  try {
    await ensureMfaTable();
    const sql = getSql();
    const rows = (await sql`
      SELECT secret, enabled FROM user_mfa WHERE email = ${email.toLowerCase()}
    `) as { secret: string; enabled: boolean }[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

