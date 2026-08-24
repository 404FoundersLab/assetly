-- Migration: Add serial_number column to endpoints table
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_endpoints_serial_number ON endpoints(serial_number);
