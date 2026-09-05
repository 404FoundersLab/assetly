import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { webcrypto } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const env = readFileSync(resolve(root, '.env'), 'utf8');
const m = env.match(/^DATABASE_URL=(.+)$/m);

const client = new pg.Client({ connectionString: m[1].trim(), ssl: { rejectUnauthorized: false } });
await client.connect();

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2v1:';

async function hashPassword(pw) {
  const saltBytes = webcrypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS }, keyMaterial, 256);
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${PBKDF2_PREFIX}${saltHex}:${hashHex}`;
}

const password = 'Dev@123456';
const hashed = await hashPassword(password);
const tenantId = '44dfb1d5-bc3c-4b6a-9874-d2f78ee67d87';
const email = 'dev@assetly.com';
const userId = crypto.randomUUID();

await client.query(`DELETE FROM users WHERE email = $1`, [email]);
await client.query(`
  INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status)
  VALUES ($1, $2, $3, 'Dev', 'Admin', 'tenant_admin', 'active')
`, [userId, tenantId, email]);

await client.query(`
  INSERT INTO user_passwords (email, password_hash, must_change_password)
  VALUES ($1, $2, false)
  ON CONFLICT (email) DO UPDATE SET password_hash = $2, must_change_password = false
`, [email, hashed]);

console.log('✅ Created user dev@assetly.com with password: Dev@123456');

await client.end();
