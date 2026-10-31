UPDATE tenants
SET enabled_modules = COALESCE(enabled_modules, '[]'::jsonb) || '["module:tasks"]'::jsonb
WHERE NOT COALESCE(enabled_modules, '[]'::jsonb) @> '["module:tasks"]'::jsonb;

CREATE TABLE IF NOT EXISTS product_opportunity_assignments (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (work_status IN ('not_started', 'in_progress', 'done')),
  work_started_at TIMESTAMPTZ,
  next_step TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_opportunity_assignments_user
  ON product_opportunity_assignments (tenant_id, user_id, updated_at DESC);