-- Asset / accessory requests from employees (employee portal)
-- Run after 001_assetly_schema.sql

CREATE TABLE IF NOT EXISTS asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('new', 'replacement', 'accessory')),
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  needed_by DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected', 'fulfilled')),
  review_notes TEXT,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_requests_tenant ON asset_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_employee ON asset_requests(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_status ON asset_requests(tenant_id, status);

ALTER TABLE asset_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_requests_all" ON asset_requests FOR ALL USING (true) WITH CHECK (true);

-- Demo employee linked to portal login (sarah.chen@solumtechnologies.com)
INSERT INTO employees (
  id, tenant_id, employee_number, first_name, last_name, email, job_title, department_id, status, hire_date
) VALUES (
  '44444444-4444-4444-4444-444444444401',
  '11111111-1111-1111-1111-111111111111',
  'EMP-001',
  'Sarah',
  'Chen',
  'sarah.chen@solumtechnologies.com',
  'Senior Engineer',
  '22222222-2222-2222-2222-222222222201',
  'active',
  '2024-01-15'
)
ON CONFLICT (tenant_id, email) DO NOTHING;
