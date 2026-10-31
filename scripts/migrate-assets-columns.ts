import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
  console.log('Applying asset columns migration (department, specs, image_url, repair_cost, qr_code_data)...');

  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS department VARCHAR(255)`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS specs TEXT`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS repair_cost NUMERIC(12,2) DEFAULT 0`;
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS qr_code_data VARCHAR(500)`;

  console.log('Asset columns migration applied successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
