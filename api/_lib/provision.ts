/**
 * Provisions a dedicated Neon branch for a new tenant and runs the schema.
 *
 * Required env vars (when using dedicated DBs):
 *   NEON_API_KEY      — Neon personal access token
 *   NEON_PROJECT_ID   — Neon project to create branches in
 *
 * If those vars are absent the function returns null and the tenant uses
 * the shared database (infrastructure_strategy = 'shared').
 */

import { neon } from '@neondatabase/serverless';

// ── Tenant-specific schema DDL ────────────────────────────────────────────────
// Note: tenant_id is kept as a plain UUID column (no FK) because each tenant
// DB has no platform-level "tenants" table.  All existing query code that
// filters by tenant_id continues to work unchanged.
const TENANT_SCHEMA_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  `CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    cost_center VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
  )`,

  `CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    website VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
  )`,

  `CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    department_id UUID REFERENCES departments(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id)`,

  `CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    asset_tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'in_stock',
    lifecycle_stage VARCHAR(30) NOT NULL DEFAULT 'active',
    purchase_date DATE,
    purchase_cost NUMERIC(12,2) DEFAULT 0,
    current_value NUMERIC(12,2) DEFAULT 0,
    location VARCHAR(255),
    department VARCHAR(255),
    specs TEXT,
    image_url TEXT,
    vendor_id UUID REFERENCES vendors(id),
    assigned_employee_id UUID REFERENCES employees(id),
    warranty_expires_at DATE,
    notes TEXT,
    qr_code_data VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, asset_tag)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(tenant_id, status)`,

  `CREATE TABLE IF NOT EXISTS asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    assigned_by VARCHAR(255),
    notes TEXT,
    return_condition TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS ownership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    performed_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    action VARCHAR(30) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    entity_label VARCHAR(255),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS asset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('new','replacement','accessory')),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    needed_by DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted'
      CHECK (status IN ('submitted','approved','rejected','fulfilled')),
    review_notes TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_asset_requests_tenant ON asset_requests(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_asset_requests_employee ON asset_requests(tenant_id, employee_id)`,

  `CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL DEFAULT 'annual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,

  // Endpoint security tables
  `CREATE TABLE IF NOT EXISTS endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    os_version VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    status VARCHAR(50) DEFAULT 'active',
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    cpu_model VARCHAR(255),
    ram_total_gb NUMERIC(6,2),
    storage_total_gb NUMERIC(8,2),
    windows_updates JSONB,
    firewall_status VARCHAR(50),
    defender_status VARCHAR(50),
    antivirus_updated_at TIMESTAMPTZ,
    active_ports JSONB,
    last_logged_user VARCHAR(255),
    uptime_seconds BIGINT,
    last_reboot_at TIMESTAMPTZ,
    agent_version VARCHAR(50),
    bitlocker_status VARCHAR(50),
    bitlocker_drive VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_endpoints_tenant ON endpoints(tenant_id)`,

  `CREATE TABLE IF NOT EXISTS endpoint_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5,2),
    memory_total BIGINT,
    memory_used BIGINT,
    running_processes JSONB,
    reported_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS endpoint_threats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    threat_type VARCHAR(100),
    severity VARCHAR(20),
    description TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
  )`,

  `CREATE TABLE IF NOT EXISTS endpoint_installed_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    publisher VARCHAR(255),
    install_date DATE,
    cve_count INTEGER DEFAULT 0,
    cve_ids TEXT[]
  )`,

  `CREATE TABLE IF NOT EXISTS endpoint_commands (
    id SERIAL PRIMARY KEY,
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    command VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`,
];

// ── Neon branch provisioning ──────────────────────────────────────────────────

interface NeonBranchResponse {
  branch: { id: string; name: string };
  endpoints: { host: string }[];
  connection_uris: { connection_uri: string }[];
}

/**
 * Creates a new Neon branch for the tenant, runs the schema, and returns
 * the connection string.  Returns null when NEON_API_KEY / NEON_PROJECT_ID
 * are not configured (tenant falls back to shared DB).
 */
export async function provisionTenantDatabase(tenantSlug: string): Promise<string | null> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey || !projectId) return null;

  // 1. Create the Neon branch
  const res = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}/branches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch: { name: `tenant-${tenantSlug}` },
      endpoints: [{ type: 'read_write' }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon branch creation failed: ${text}`);
  }

  const data = (await res.json()) as NeonBranchResponse;
  const connectionString = data.connection_uris?.[0]?.connection_uri;

  if (!connectionString) {
    throw new Error('Neon API did not return a connection URI');
  }

  // 2. Run the tenant schema on the new DB
  // neon's HTTP driver has no .unsafe() — use the tagged-template workaround
  // for raw SQL strings: pass the string as if it were a template literal.
  const sql = neon(connectionString);
  for (const stmt of TENANT_SCHEMA_STATEMENTS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sql as any)(Object.assign([stmt], { raw: [stmt] }));
  }

  return connectionString;
}
