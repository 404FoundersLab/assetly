-- Migration: Add remote desktop sessions table for web relay support
CREATE TABLE IF NOT EXISTS remote_desktop_sessions (
    endpoint_id UUID PRIMARY KEY REFERENCES endpoints(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT FALSE,
    last_frame TEXT,
    command_result TEXT,
    input_queue JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remote_desktop_sessions_updated ON remote_desktop_sessions(updated_at);
