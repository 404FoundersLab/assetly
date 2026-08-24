import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envStr = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
for (const line of envStr.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    process.env.DATABASE_URL = line.split('=')[1].trim();
  }
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  console.log(tables.map((t) => t.table_name));
}
run();
