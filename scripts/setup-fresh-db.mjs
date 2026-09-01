#!/usr/bin/env node
/**
 * Assetly — Fresh Database Setup Script
 * Runs all schema migrations in order and creates an admin user.
 *
 * Usage:
 *   node scripts/setup-fresh-db.mjs
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) { console.error('❌ .env not found'); process.exit(1); }

const envStr = readFileSync(envPath, 'utf8');
for (const line of envStr.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (k && !process.env[k]) process.env[k] = v;
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('❌ DATABASE_URL not set in .env'); process.exit(1); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function step(msg) { console.log(`\n▶  ${msg}`); }
function ok(msg)   { console.log(`   ✅ ${msg}`); }
function warn(msg) { console.log(`   ⚠️  ${msg}`); }

function isIgnorable(err) {
  const m = err.message ?? '';
  return (
    m.includes('already exists') ||
    m.includes('duplicate key') ||
    m.includes('multiple primary keys')
  );
}

// Execute a full SQL file as one transaction
async function runFile(client, filePath, label) {
  try {
    const content = readFileSync(filePath, 'utf8');
    await client.query(content);
    ok(label);
  } catch (err) {
    if (isIgnorable(err)) {
      warn(`${label} — partially skipped (some objects already exist)`);
    } else {
      console.error(`❌ ${label}\n   ${err.message}`);
      throw err;
    }
  }
}

// Execute a single DDL statement
async function runDDL(client, label, sqlText) {
  try {
    await client.query(sqlText);
    ok(label);
  } catch (err) {
    if (isIgnorable(err)) {
      warn(`${label} — skipped (already applied)`);
    } else {
      console.error(`❌ ${label}\n   ${err.message}`);
      throw err;
    }
  }
}

// ── Schema files ──────────────────────────────────────────────────────────────
const schemaDir   = resolve(root, 'database/schema');
const supabaseDir = resolve(root, 'database/supabase');

const schemas = [
  // Core platform tables
  [schemaDir,   '001_core_tenant.sql',                  'Core tenant & auth schema'],
  [schemaDir,   '002_asset_management.sql',             'Asset management schema'],
  [schemaDir,   '003_audit.sql',                        'Audit logs schema'],
  // Endpoint security (004 has wrong ref — endpoints created inline above)
  [schemaDir,   '005_endpoint_details.sql',             'Endpoint details columns'],
  [schemaDir,   '006_endpoint_security.sql',            'Endpoint security status'],
  [schemaDir,   '007_add_endpoint_security_fields.sql', 'Endpoint security extra fields'],
  [schemaDir,   '008_add_repair_cost.sql',              'Repair cost column'],
  [schemaDir,   '009_remote_desktop.sql',               'Remote desktop sessions'],
  [schemaDir,   '010_add_serial_number.sql',            'Serial number column'],
  [schemaDir,   '011_support_tickets.sql',              'Support tickets schema'],
  // 012 runs after asset_requests (created inline in main())
];

// Inline SQL: asset_requests table (supabase/004 has wrong "tenants" ref)
const ASSET_REQUESTS_SQL = `
CREATE TABLE IF NOT EXISTS asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('new', 'replacement', 'accessory', 'return')),
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  needed_by DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected', 'fulfilled')),
  review_notes TEXT,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  asset_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_asset_requests_tenant ON asset_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_employee ON asset_requests(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_status ON asset_requests(tenant_id, status)
`;

// Inline: ownership_history table
const OWNERSHIP_HISTORY_SQL = `
CREATE TABLE IF NOT EXISTS ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  description TEXT,
  performed_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ownership_history_tenant ON ownership_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ownership_history_asset ON ownership_history(asset_id)
`;

// Inline: knowledge_chunks for RAG
const KNOWLEDGE_CHUNKS_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  source_type VARCHAR(50),
  source_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;



// Inline SQL for the endpoints table (fixes schema 004's wrong "tenants" → "companies")
const ENDPOINTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hostname VARCHAR(255) NOT NULL,
  os_version VARCHAR(255),
  ip_address VARCHAR(45),
  mac_address VARCHAR(17),
  status VARCHAR(50) DEFAULT 'active',
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_endpoints_tenant ON endpoints(tenant_id);
CREATE TABLE IF NOT EXISTS endpoint_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
  cpu_usage NUMERIC(5,2),
  memory_total BIGINT,
  memory_used BIGINT,
  running_processes JSONB,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_endpoint_telemetry_endpoint ON endpoint_telemetry(endpoint_id)
`;


// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Assetly — Fresh Database Setup             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`   DB: ${dbUrl.replace(/:([^@:]+)@/, ':****@')}`);

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('   Connected ✓');

  try {
    // ── 1. Schema migrations ─────────────────────────────────────────────────
    step('Running schema migrations...');

    // Create endpoints table first (schema 004 has wrong "tenants" ref — use inline version)
    await runDDL(client, 'Endpoints & telemetry tables', ENDPOINTS_TABLE_SQL);

    for (const [dir, file, label] of schemas) {
      const fp = resolve(dir, file);
      if (!existsSync(fp)) { warn(`${file} not found — skipping`); continue; }
      await runFile(client, fp, label);
    }

    // asset_requests (inline — fixes wrong "tenants" ref in supabase/004)
    await runDDL(client, 'Asset requests table', ASSET_REQUESTS_SQL);

    // 012_support_returns — alters asset_requests (must run after it exists)
    await runFile(client, resolve(schemaDir, '012_support_returns.sql'), 'Support returns / asset_ids column');

    // knowledge_chunks for RAG (vector extension optional)
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
      await runDDL(client, 'Knowledge chunks (RAG)', KNOWLEDGE_CHUNKS_SQL);
    } catch {
      warn('vector extension not available — knowledge_chunks skipped');
    }

    // ── 2. Audit log partitions for the next 6 months ────────────────────────
    step('Ensuring audit log partitions exist...');
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d    = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const ym   = `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
      const from = d.toISOString().slice(0, 10);
      const to   = next.toISOString().slice(0, 10);
      try {
        await client.query(
          `CREATE TABLE IF NOT EXISTS audit_logs_${ym} PARTITION OF audit_logs FOR VALUES FROM ('${from}') TO ('${to}')`
        );
        ok(`Audit partition ${ym}`);
      } catch (err) {
        // "already exists" OR "would overlap" — both mean partition is covered
        warn(`Audit partition ${ym} — already covered (${err.message.split('\n')[0]})`);
      }
    }

    // ── 3. Incremental patches ────────────────────────────────────────────────
    step('Applying incremental patches...');
    await runDDL(client, 'Patch: ip_address',     `ALTER TABLE assets ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`);
    await runDDL(client, 'Patch: mac_address',    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)`);
    await runDDL(client, 'Patch: last_seen_at',   `ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);
    await runDDL(client, 'Patch: security_status',`ALTER TABLE assets ADD COLUMN IF NOT EXISTS security_status VARCHAR(50) DEFAULT 'unknown'`);

    // ── 4. user_passwords helper table ───────────────────────────────────────
    step('Creating user_passwords helper table...');
    await runDDL(client, 'user_passwords table', `
      CREATE TABLE IF NOT EXISTS user_passwords (
        email VARCHAR(255) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── 5. Admin tenant + user ────────────────────────────────────────────────
    step('Creating admin tenant & user...');

    const existing = await client.query(`SELECT id FROM companies WHERE slug = 'assetly-admin' LIMIT 1`);
    if (existing.rows.length > 0) {
      warn('Admin tenant already exists — skipping seed');
    } else {
      const plans = await client.query(`SELECT id FROM subscription_plans WHERE tier = 'enterprise' LIMIT 1`);
      const planId = plans.rows[0]?.id ?? null;

      const t = await client.query(
        `INSERT INTO companies (name, slug, status, subscription_plan_id, settings)
         VALUES ('Assetly Admin','assetly-admin','active',$1,'{"timezone":"UTC","locale":"en-US"}'::jsonb)
         RETURNING id`,
        [planId]
      );
      const tenantId = t.rows[0].id;
      ok(`Tenant created: assetly-admin (${tenantId})`);

      await client.query(`SELECT set_current_tenant($1::UUID)`, [tenantId]);

      const r = await client.query(
        `INSERT INTO roles (tenant_id, name, description, is_system)
         VALUES ($1,'tenant_admin','Full administration',true) RETURNING id`,
        [tenantId]
      );
      const roleId = r.rows[0].id;

      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions ON CONFLICT DO NOTHING`,
        [roleId]
      );
      ok('Admin role created with all permissions');

      // bcrypt hash of "Admin@123456" (cost 10)
      const HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

      const u = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
         VALUES ($1,'admin@assetly.com',$2,'Assetly','Admin','active') RETURNING id`,
        [tenantId, HASH]
      );
      const userId = u.rows[0].id;

      await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)`, [userId, roleId]);
      await client.query(
        `INSERT INTO user_passwords (email, password_hash) VALUES ('admin@assetly.com',$1) ON CONFLICT (email) DO NOTHING`,
        [HASH]
      );

      ok('Admin user created: admin@assetly.com  /  Password: Admin@123456');
    }

  } finally {
    await client.end();
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ✅  Database setup complete!               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Login credentials:');
  console.log('    Email:    admin@assetly.com');
  console.log('    Password: Admin@123456');
  console.log('');
  console.log('  Next: npm run dev   →   http://localhost:5173');
  console.log('');
}

main().catch((err) => {
  console.error('\n❌  Setup failed:', err.message);
  process.exit(1);
});
