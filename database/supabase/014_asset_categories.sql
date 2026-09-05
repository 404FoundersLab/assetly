-- Tenant-managed asset / device types (ESL, gateway, Newton, EPD, firmware kits, …)

CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  slug VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_requests BOOLEAN NOT NULL DEFAULT true,
  is_peripheral BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_tenant ON asset_categories (tenant_id, sort_order);

INSERT INTO asset_categories (tenant_id, slug, label, sort_order, show_in_requests, is_peripheral)
SELECT t.id, v.slug, v.label, v.sort_order, v.show_in_requests, v.is_peripheral
FROM tenants t
CROSS JOIN (
  VALUES
    ('laptop', 'Laptop', 10, true, false),
    ('desktop', 'Desktop', 20, true, false),
    ('server', 'Server', 30, true, false),
    ('mobile', 'Mobile', 40, true, false),
    ('monitor', 'Monitor', 50, true, true),
    ('keyboard', 'Keyboard', 60, true, true),
    ('mouse', 'Mouse', 70, true, true),
    ('webcam', 'Webcam', 80, false, true),
    ('headset', 'Headset', 90, true, true),
    ('peripheral', 'Peripheral', 100, true, true),
    ('network', 'Network', 110, false, false),
    ('software', 'Software', 120, false, false),
    ('esl', 'Electronic Shelf Label', 130, false, false),
    ('gateway', 'Gateway', 140, false, false),
    ('newton', 'Newton', 150, false, false),
    ('epd_23_inch', 'EPD 23 inch display', 160, false, false),
    ('firmware_kit', 'Firmware Kit', 170, false, false),
    ('other', 'Other', 999, true, false)
) AS v(slug, label, sort_order, show_in_requests, is_peripheral)
ON CONFLICT (tenant_id, slug) DO NOTHING;
