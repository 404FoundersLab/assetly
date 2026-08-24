ALTER TABLE endpoints
ADD COLUMN cpu_model VARCHAR(255),
ADD COLUMN ram_total_gb NUMERIC,
ADD COLUMN storage_total_gb NUMERIC,
ADD COLUMN windows_updates JSONB;
