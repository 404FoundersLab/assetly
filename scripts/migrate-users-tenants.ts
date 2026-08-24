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
  const query = readFileSync(resolve(process.cwd(), 'database/supabase/005_users_and_tenants.sql'), 'utf-8');
  
  const statements = query.split(';').filter(stmt => stmt.trim().length > 0);
  for (const stmt of statements) {
    await sql(stmt);
  }
  
  console.log('Users and Tenants migration applied');
}

run().catch(console.error);
