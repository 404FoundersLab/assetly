-- Add support for device return requests
-- Run after 011_support_tickets.sql

ALTER TABLE asset_requests ADD COLUMN IF NOT EXISTS asset_ids UUID[];

ALTER TABLE asset_requests DROP CONSTRAINT IF EXISTS asset_requests_request_type_check;
ALTER TABLE asset_requests ADD CONSTRAINT asset_requests_request_type_check 
  CHECK (request_type IN ('new', 'replacement', 'accessory', 'return'));
