import { createServer } from 'node:http';
import { handleApiRequest, loadEnv } from './api-dev-core';

loadEnv();

const port = Number(process.env.API_PORT ?? 3000);

const server = createServer((req, res) => {
  void handleApiRequest(req, res);
});

server.on('error', (err) => {
  if (err && 'code' in err && err.code === 'EADDRINUSE') {
    console.error(`\nPort ${port} is already in use.`);
    console.error('Run: npm run dev   (from apps/web) — it will restart a stale API automatically.');
    console.error('Or stop the old process manually and run: npm run dev:api\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

const host = process.env.API_HOST ?? '0.0.0.0';

async function syncAdminAccounts() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { getSql } = await import('../api/_lib/db');
    const sql = getSql();
    await sql`
      INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
      VALUES 
        ('11111111-1111-1111-1111-111111111198', '11111111-1111-1111-1111-111111111111', 'itadmin.sti@solum-group.com', 'Pavan', 'Admin', 'tenant_admin'),
        ('11111111-1111-1111-1111-111111111199', '11111111-1111-1111-1111-111111111111', 'pramod.sv@solum-group.com', 'Pramod', 'Admin', 'platform_admin')
      ON CONFLICT (email) DO UPDATE
        SET role = EXCLUDED.role, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, tenant_id = EXCLUDED.tenant_id;

      INSERT INTO user_passwords (email, password_hash, updated_at)
      VALUES
        ('itadmin.sti@solum-group.com', 'pbkdf2v1:64d154d26b6e0c63d002104716bcec52:d66c2a136e24769994bb2c07701237126e6d807dd078da96a37ff57319fd2fe9', NOW()),
        ('pramod.sv@solum-group.com', 'pbkdf2v1:0c358689e697f80a1d0d0607b88d2da3:502ad605878acfcaf8ec4d326ba80dc73a70b8d2f2dc177d3a6d7842c95216a2', NOW())
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
    `;
    console.log('Verified admin accounts (itadmin.sti@solum-group.com, pramod.sv@solum-group.com)');
  } catch (e) {
    console.warn('Could not auto-seed admin accounts:', e);
  }
}

server.listen(port, host, () => {
  const hasDb = Boolean(process.env.DATABASE_URL);
  console.log(`API listening on http://${host}:${port}`);
  console.log(`DATABASE_URL: ${hasDb ? 'configured' : 'MISSING — add to .env'}`);
  void syncAdminAccounts();
});
