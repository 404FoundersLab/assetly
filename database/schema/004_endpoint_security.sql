-- Endpoint Security Tables

CREATE TABLE IF NOT EXISTS endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL,
    os_version VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, compromised
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_endpoints_tenant ON endpoints(tenant_id);

CREATE TABLE IF NOT EXISTS endpoint_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5,2),
    memory_total BIGINT,
    memory_used BIGINT,
    running_processes JSONB,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_endpoint_telemetry_endpoint ON endpoint_telemetry(endpoint_id);
