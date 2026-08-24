import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(resolve(root, '.env'), 'utf8');
const m = env.match(/^DATABASE_URL=(.+)$/m);
if (!m) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(m[1].trim());

await sql`
  CREATE TABLE IF NOT EXISTS user_passwords (
    email VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const rows = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_passwords'
`;
console.log(rows.length ? 'OK: user_passwords table exists' : 'FAIL: table not created');
