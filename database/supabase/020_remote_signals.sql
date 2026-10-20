-- 020: WebRTC signaling for remote control (offer/answer/ICE candidates exchanged via the relay API)
CREATE TABLE IF NOT EXISTS remote_signals (
    id BIGSERIAL PRIMARY KEY,
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- 'to_agent' | 'to_viewer'
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remote_signals_lookup ON remote_signals(endpoint_id, direction, id);

