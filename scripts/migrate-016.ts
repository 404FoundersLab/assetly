import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  const query = readFileSync(resolve(process.cwd(), 'database/supabase/016_hide_infra_from_requests.sql'), 'utf-8');
  const statements = query.split(';').filter((s) => s.trim().length > 0);
  for (const stmt of statements) {
    if (stmt.trim()) {
      await sql(stmt);
    }
  }
  console.log('Migration 016 (hide office infrastructure from employee requests) applied');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
