-- Group device types into the four inventory menus:
-- IT Assets, Peripherals, Network devices, Store devices.

ALTER TABLE asset_categories
  ADD COLUMN IF NOT EXISTS family VARCHAR(20) NOT NULL DEFAULT 'it_asset';

UPDATE asset_categories SET family = 'peripheral', is_peripheral = true
WHERE slug IN ('monitor', 'keyboard', 'mouse', 'webcam', 'headset', 'peripheral');

UPDATE asset_categories SET family = 'network', is_peripheral = false
WHERE slug IN ('network', 'cctv', 'ip_camera', 'wifi_router', 'switch', 'firewall', 'access_point');

UPDATE asset_categories SET family = 'store', is_peripheral = false
WHERE slug IN (
  'esl', 'gateway', 'newton', 'newton_eye', 'epd_23_inch',
  'display_32_inch', 'led_display', 'lcd_display', 'firmware_kit'
);

UPDATE asset_categories SET family = 'it_asset', is_peripheral = false
WHERE slug IN ('laptop', 'desktop', 'server', 'mobile', 'software', 'other');

UPDATE asset_categories SET label = 'Other accessory' WHERE slug = 'peripheral';
UPDATE asset_categories SET label = 'Other network gear' WHERE slug = 'network';

INSERT INTO asset_categories (tenant_id, slug, label, sort_order, show_in_requests, is_peripheral, family)
SELECT t.id, v.slug, v.label, v.sort_order, v.show_in_requests, v.is_peripheral, v.family
FROM tenants t
CROSS JOIN (
  VALUES
    ('laptop', 'Laptop', 10, true, false, 'it_asset'),
    ('desktop', 'Desktop', 20, true, false, 'it_asset'),
    ('server', 'Server', 30, true, false, 'it_asset'),
    ('mobile', 'Mobile', 40, true, false, 'it_asset'),
    ('software', 'Software', 50, false, false, 'it_asset'),
    ('other', 'Other', 60, true, false, 'it_asset'),
    ('monitor', 'Monitor', 110, true, true, 'peripheral'),
    ('keyboard', 'Keyboard', 120, true, true, 'peripheral'),
    ('mouse', 'Mouse', 130, true, true, 'peripheral'),
    ('webcam', 'Webcam', 140, false, true, 'peripheral'),
    ('headset', 'Headset', 150, true, true, 'peripheral'),
    ('peripheral', 'Other accessory', 160, true, true, 'peripheral'),
    ('cctv', 'CCTV', 210, false, false, 'network'),
    ('ip_camera', 'IP camera', 220, false, false, 'network'),
    ('access_point', 'Access point', 230, false, false, 'network'),
    ('wifi_router', 'Wi-Fi router', 240, false, false, 'network'),
    ('switch', 'Switch', 250, false, false, 'network'),
    ('firewall', 'Firewall', 260, false, false, 'network'),
    ('network', 'Other network gear', 270, false, false, 'network'),
    ('esl', 'Electronic Shelf Label', 310, false, false, 'store'),
    ('gateway', 'Gateway', 320, false, false, 'store'),
    ('newton', 'Newton', 330, false, false, 'store'),
    ('newton_eye', 'Newton Eye camera', 340, false, false, 'store'),
    ('epd_23_inch', 'EPD 23 inch display', 350, false, false, 'store'),
    ('display_32_inch', '32 inch display', 360, false, false, 'store'),
    ('led_display', 'LED display', 370, false, false, 'store'),
    ('lcd_display', 'LCD display', 380, false, false, 'store'),
    ('firmware_kit', 'Firmware Kit', 390, false, false, 'store')
) AS v(slug, label, sort_order, show_in_requests, is_peripheral, family)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  family = EXCLUDED.family,
  is_peripheral = EXCLUDED.is_peripheral,
  sort_order = EXCLUDED.sort_order,
  label = EXCLUDED.label;
