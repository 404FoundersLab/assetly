-- Migration: Add repair_cost column to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS repair_cost DECIMAL(12,2) DEFAULT 0;

-- Seed some mock repair charges for realistic presentation data
UPDATE assets SET repair_cost = 150.00 WHERE id IN (
  SELECT id FROM assets WHERE status = 'in_repair' LIMIT 2
);
UPDATE assets SET repair_cost = 250.00 WHERE id IN (
  SELECT id FROM assets WHERE status = 'retired' LIMIT 2
);
UPDATE assets SET repair_cost = 75.00 WHERE id IN (
  SELECT id FROM assets WHERE status = 'deployed' LIMIT 5
);
