-- Employees can request personal and accessory devices.
-- Hide cameras (webcam, CCTV) from the portal form.

UPDATE asset_categories
SET show_in_requests = true
WHERE slug IN (
  'server',
  'monitor',
  'keyboard',
  'mouse',
  'headset',
  'peripheral'
);

UPDATE asset_categories
SET show_in_requests = false
WHERE slug IN ('webcam', 'cctv');
