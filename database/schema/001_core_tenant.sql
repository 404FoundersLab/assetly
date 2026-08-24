-- IT Asset Platform - Core Tenant & Auth Schema
-- PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'locked');
CREATE TYPE auth_provider AS ENUM ('local', 'ldap', 'saml', 'entra');
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise', 'msp');

-- Subscription plans (platform-level, not tenant-scoped)
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tier subscription_tier NOT NULL,
    max_endpoints INT NOT NULL DEFAULT 100,
    max_admins INT NOT NULL DEFAULT 3,
    max_network_devices INT NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    price_per_endpoint DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies (tenants)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    msp_parent_id UUID REFERENCES companies(id),
    status tenant_status NOT NULL DEFAULT 'trial',
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    settings JSONB NOT NULL DEFAULT '{}',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_slug ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_msp_parent ON companies(msp_parent_id);

-- Permissions (platform-level)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles (tenant-scoped + system roles with tenant_id NULL)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    auth_provider auth_provider NOT NULL DEFAULT 'local',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- RLS helper function
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Seed subscription plans
INSERT INTO subscription_plans (name, tier, max_endpoints, max_admins, features, price_per_endpoint) VALUES
    ('Starter', 'starter', 100, 3, '["asset_management", "email_alerts"]', 2.00),
    ('Professional', 'professional', 1000, 15, '["asset_management", "monitoring", "remote_mgmt", "slack_alerts"]', 4.00),
    ('Enterprise', 'enterprise', 100000, 9999, '["all"]', 0.00),
    ('MSP Partner', 'msp', 100000, 9999, '["all", "white_label", "msp_hierarchy"]', 3.00);

-- Seed permissions
INSERT INTO permissions (code, description, resource, action) VALUES
    ('asset:read', 'View assets', 'asset', 'read'),
    ('asset:write', 'Create and update assets', 'asset', 'write'),
    ('asset:delete', 'Delete assets', 'asset', 'delete'),
    ('asset:assign', 'Assign and return assets', 'asset', 'assign'),
    ('employee:read', 'View employees', 'employee', 'read'),
    ('employee:write', 'Manage employees', 'employee', 'write'),
    ('employee:delete', 'Delete employees', 'employee', 'delete'),
    ('department:read', 'View departments', 'department', 'read'),
    ('department:write', 'Manage departments', 'department', 'write'),
    ('vendor:read', 'View vendors', 'vendor', 'read'),
    ('vendor:write', 'Manage vendors', 'vendor', 'write'),
    ('audit:read', 'View audit logs', 'audit', 'read'),
    ('user:read', 'View users', 'user', 'read'),
    ('user:write', 'Manage users', 'user', 'write'),
    ('dashboard:read', 'View dashboard', 'dashboard', 'read'),
    ('settings:write', 'Manage tenant settings', 'settings', 'write');
