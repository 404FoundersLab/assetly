-- Add per-tenant database connection URL for database-per-tenant isolation.
-- When set, all data queries for this tenant are routed to their dedicated DB.
-- When NULL, the tenant uses the shared database (default / shared-DB tenants).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS database_url TEXT DEFAULT NULL;

COMMENT ON COLUMN tenants.database_url IS
  'Connection string for this tenant''s dedicated PostgreSQL database. '
  'NULL = shared database. Set automatically by the provisioning API when '
  'infrastructure_strategy = ''dedicated'' and NEON_API_KEY is configured.';
