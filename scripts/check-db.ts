import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envStr = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
for (const line of envStr.split('\n')) {
  if (line.trim() && !line.startsWith('#') && line.includes('=')) {
    const [k, ...v] = line.split('=');
    process.env[k.trim()] = v.join('=').trim();
  }
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
      SELECT id, tenant_id, hostname, ip_address, last_seen_at, status
      FROM endpoints
      ORDER BY last_seen_at DESC
  `;
  console.log('All Endpoints in Database:');
  console.log(JSON.stringify(rows, null, 2));
}
run();
