import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env
const envStr = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
for (const line of envStr.split('\n')) {
  if (line.trim() && !line.startsWith('#') && line.includes('=')) {
    const [k, ...v] = line.split('=');
    process.env[k.trim()] = v.join('=').trim();
  }
}

async function run() {
  try {
    console.log('Connecting to database...');
    const sql = neon(process.env.DATABASE_URL);
    const script = readFileSync(resolve(process.cwd(), 'database/schema/004_endpoint_security.sql'), 'utf-8');
    
    console.log('Executing schema...');
    const statements = script.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      await sql(stmt);
    }
    console.log('Database updated successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
