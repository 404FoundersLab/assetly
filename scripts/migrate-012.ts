import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load env from possible locations
const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'assetly/.env'),
];

for (const envPath of candidates) {
  if (existsSync(envPath)) {
    const envStr = readFileSync(envPath, 'utf-8');
    for (const line of envStr.split('\n')) {
      if (line.trim() && !line.startsWith('#')) {
        const [k, ...v] = line.split('=');
        if (k && v && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    }
    break;
  }
}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Please provide it in .env');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log('Applying Migration 012 (joining_email and official_email columns)...');

  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_email TEXT`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_email TEXT`;
  await sql`UPDATE employees SET joining_email = email WHERE joining_email IS NULL`;

  console.log('Migration 012 applied successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
