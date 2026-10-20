-- 019: Command queue for endpoint actions (sync, force-scan, isolate, screenshot, remote)
CREATE TABLE IF NOT EXISTS endpoint_commands (
    id SERIAL PRIMARY KEY,
    endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
    command VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    result TEXT
);

CREATE INDEX IF NOT EXISTS idx_endpoint_commands_pending ON endpoint_commands(endpoint_id, status);

