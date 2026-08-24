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
  const sql = neon(process.env.DATABASE_URL!);
  
  await sql`UPDATE users SET email = 'maha@kraft.com' WHERE email = 'maha@kraft'`;
  await sql`UPDATE user_passwords SET email = 'maha@kraft.com' WHERE email = 'maha@kraft'`;
  
  const users = await sql`SELECT email, role, password_hash FROM users WHERE email LIKE '%maha%'`;
  console.log('Users matching maha:', users);
}

run().catch(console.error);
