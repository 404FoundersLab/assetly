-- 018: Endpoint screenshot monitoring (per-device configurable interval)
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS screenshot_interval_seconds INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS endpoint_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_endpoint_screenshots_endpoint ON endpoint_screenshots(endpoint_id, captured_at DESC)

