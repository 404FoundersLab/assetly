-- Assetly — Postgres schema (Neon / Supabase / any PostgreSQL 15+)
-- Run this in Neon SQL Editor or Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Demo tenant (single-tenant MVP; expand to multi-tenant later)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'professional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cost_center VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  website VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_tag VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'in_stock',
  lifecycle_stage VARCHAR(30) NOT NULL DEFAULT 'active',
  purchase_date DATE,
  purchase_cost NUMERIC(12, 2) DEFAULT 0,
  current_value NUMERIC(12, 2) DEFAULT 0,
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
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  assigned_by VARCHAR(255),
  notes TEXT,
  return_condition TEXT
);

CREATE TABLE IF NOT EXISTS ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  description TEXT,
  performed_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(100),
  user_name VARCHAR(255),
  action VARCHAR(30) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  entity_label VARCHAR(255),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supabase: enable RLS (optional — API uses service role / direct connection)
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon key demo (tighten in production)
CREATE POLICY "assets_all" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "employees_all" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "departments_all" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vendors_all" ON vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "audit_all" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
