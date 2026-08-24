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
  
  console.log('Applying 009_subscription.sql...');
  const sql009 = readFileSync(resolve(process.cwd(), 'database/supabase/009_subscription.sql'), 'utf-8');
  const statements009 = sql009.split(';').filter((s: string) => s.trim().length > 0);
  for (const stmt of statements009) {
    if (stmt.trim()) {
      await sql(stmt);
    }
  }
  console.log('009_subscription.sql applied.');

  console.log('Applying 010_billing_region.sql...');
  const sql010 = readFileSync(resolve(process.cwd(), 'database/supabase/010_billing_region.sql'), 'utf-8');
  const statements010 = sql010.split(';').filter((s: string) => s.trim().length > 0);
  for (const stmt of statements010) {
    if (stmt.trim()) {
      await sql(stmt);
    }
  }
  console.log('010_billing_region.sql applied.');
  console.log('Database migrated successfully!');
}

run().catch(console.error);
