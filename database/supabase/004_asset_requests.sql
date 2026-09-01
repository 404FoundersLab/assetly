-- Asset / accessory requests from employees (employee portal)
-- Run after 001_assetly_schema.sql

CREATE TABLE IF NOT EXISTS asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- Note: demo employee seed removed (UUIDs are dynamic in fresh installs)
