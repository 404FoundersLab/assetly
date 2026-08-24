import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const m = env.match(/^DATABASE_URL=(.+)$/m);
if (!m) {
  console.log('FAIL: DATABASE_URL not found in .env');
  process.exit(1);
}

const url = m[1].trim();
const host = url.includes('neon.tech') ? 'Neon' : url.includes('supabase') ? 'Supabase' : 'unknown';

try {
  const sql = neon(url);
  await sql`SELECT 1 as ok`;
  console.log('DB connection: OK (' + host + ')');
  console.log('Pooler URL:', url.includes('pooler') ? 'yes' : 'no');

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('assets', 'tenants', 'employees', 'departments', 'vendors', 'user_passwords')
    ORDER BY table_name
  `;
  const names = tables.map((t) => t.table_name);
  if (names.length === 0) {
    console.log('Tables: NONE — run database/supabase/001_assetly_schema.sql in Neon SQL Editor');
  } else {
    console.log('Tables found:', names.join(', '));
    if (!names.includes('assets')) console.log('WARN: assets table missing');
  }
} catch (e) {
  console.log('DB connection: FAILED');
  console.log('Error:', e.message?.slice(0, 200));
  process.exit(1);
}
