-- 017 — Add enabled_modules to tenants table for granular module access control
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '["module:assets", "module:hr", "module:docs", "module:finance"]'::jsonb;

-- Backfill any existing tenants where enabled_modules is NULL
UPDATE tenants 
SET enabled_modules = '["module:assets", "module:hr", "module:docs", "module:finance"]'::jsonb
WHERE enabled_modules IS NULL;
