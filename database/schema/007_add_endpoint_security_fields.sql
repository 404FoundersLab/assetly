-- Migration: Add extra security fields to endpoints, and create threat/installed_apps tables.

-- Extend endpoints table
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS last_logged_user VARCHAR(255);
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS uptime_seconds BIGINT;
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS last_reboot_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS agent_version VARCHAR(50);
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS bitlocker_status VARCHAR(50) CHECK (bitlocker_status IN ('enabled', 'disabled', 'unknown'));
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS bitlocker_drive VARCHAR(10);

-- Create endpoint_threats table
CREATE TABLE IF NOT EXISTS endpoint_threats (
    id SERIAL PRIMARY KEY,
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    threat_type VARCHAR(255) NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_endpoint_threats_endpoint_id ON endpoint_threats(endpoint_id);

-- Create endpoint_installed_apps table
CREATE TABLE IF NOT EXISTS endpoint_installed_apps (
    id SERIAL PRIMARY KEY,
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    version VARCHAR(255),
    publisher VARCHAR(255),
    install_date DATE,
    cve_count INTEGER DEFAULT 0,
    cve_ids TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_endpoint_apps_endpoint_id ON endpoint_installed_apps(endpoint_id);
