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
  const query = readFileSync(resolve(process.cwd(), 'database/schema/006_endpoint_security.sql'), 'utf-8');
  await sql(query);
  console.log('Migration 006 applied');
}

run().catch(console.error);
