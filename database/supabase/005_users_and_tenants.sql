-- Add missing columns to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS infrastructure_strategy VARCHAR(50) DEFAULT 'shared',
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);

-- Create users table for system administrators and tenant users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Link users table to user_passwords via email for simplicity, or we can just join on email
-- user_passwords already has email as PRIMARY KEY.

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_all" ON users FOR ALL USING (true) WITH CHECK (true);
