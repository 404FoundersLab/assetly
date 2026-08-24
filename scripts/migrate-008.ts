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
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const query = readFileSync(resolve(process.cwd(), 'database/schema/008_add_repair_cost.sql'), 'utf-8');
  const statements = query.split(';').filter((s: string) => s.trim().length > 0);
  for (const stmt of statements) {
    if (stmt.trim()) {
      await sql(stmt);
    }
  }
  console.log('Migration 008 applied');
}

run().catch(console.error);
