import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env
const envStr = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
for (const line of envStr.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.join('=').trim();
  }
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const query = readFileSync(resolve(process.cwd(), 'database/schema/007_add_endpoint_security_fields.sql'), 'utf-8');
  const statements = query.split(';').filter((s: string) => s.trim().length > 0);
  for (const stmt of statements) {
    if (stmt.trim()) {
      await sql(stmt);
    }
  }
  console.log('Migration 007 applied');
}

run().catch(console.error);
