import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const env = readFileSync(resolve(root, '.env'), 'utf8');
const m = env.match(/^DATABASE_URL=(.+)$/m);

const client = new pg.Client({
  connectionString: m[1].trim(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

console.log('1. Adding role column to users table...');
await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'viewer'`);

console.log('2. Setting role = platform_admin for admin@assetly.com...');
await client.query(`UPDATE users SET role = 'platform_admin' WHERE email = 'admin@assetly.com'`);

console.log('3. Updating roles table...');
await client.query(`UPDATE roles SET name = 'platform_admin', description = 'Platform Super Administrator' WHERE name = 'tenant_admin'`);

console.log('4. Creating tenants table if not exists...');
await client.query(`
  CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'Professional',
    domain VARCHAR(255),
    infrastructure_strategy VARCHAR(50) DEFAULT 'shared',
    admin_email VARCHAR(255),
    admin_name VARCHAR(255),
    database_url TEXT,
    billing_region VARCHAR(10) DEFAULT 'IN',
    subscription_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

console.log('5. Ensuring default tenant in tenants table...');
await client.query(`
  INSERT INTO tenants (id, name, slug, plan, admin_email, admin_name, subscription_status)
  VALUES ('d7cf8199-b170-45f9-8741-952c154cef47', 'Assetly Platform', 'assetly-admin', 'Enterprise', 'admin@assetly.com', 'Assetly Admin', 'active')
  ON CONFLICT (slug) DO NOTHING
`);

const u = await client.query(`SELECT email, role FROM users WHERE email = 'admin@assetly.com'`);
console.log('Updated user in DB:', u.rows[0]);

await client.end();
console.log('Done!');
