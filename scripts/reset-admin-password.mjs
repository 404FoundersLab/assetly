#!/usr/bin/env node
/**
 * Reset the admin@assetly.com password using the SAME PBKDF2 algorithm
 * as the Vercel Edge runtime (api/_lib/auth.ts).
 *
 * Usage:
 *   node scripts/reset-admin-password.mjs [new-password]
 *   node scripts/reset-admin-password.mjs "Admin@123456"
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { webcrypto } from 'node:crypto';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('❌ DATABASE_URL not set in .env'); process.exit(1); }

const password = process.argv[2] || 'Admin@123456';
const email    = process.argv[3] || 'admin@assetly.com';

// ── PBKDF2 hash — identical to api/_lib/auth.ts ────────────────────────────
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX     = 'pbkdf2v1:';

async function hashPassword(pw) {
  const saltBytes = webcrypto.getRandomValues(new Uint8Array(16));
  const saltHex   = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${PBKDF2_PREFIX}${saltHex}:${hashHex}`;
}

async function main() {
  console.log(`\n🔐  Hashing password for ${email}...`);
  const hash = await hashPassword(password);
  console.log(`   Hash: ${hash.slice(0, 30)}...`);

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // Update user_passwords table
    await client.query(
      `INSERT INTO user_passwords (email, password_hash, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE
         SET password_hash = $2, updated_at = NOW()`,
      [email, hash]
    );

    // Also update users table (password_hash column)
    const res = await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE email = $2 RETURNING id`,
      [hash, email]
    );

    if (res.rowCount > 0) {
      console.log(`\n✅  Password updated successfully!`);
    } else {
      console.log(`\n⚠️  user_passwords updated but no user row found for ${email}`);
    }

    console.log(`\n  Login credentials:`);
    console.log(`    Email:    ${email}`);
    console.log(`    Password: ${password}`);
    console.log('');
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
