-- Assetly demo seed — run after 001_assetly_schema.sql

INSERT INTO tenants (id, name, slug, plan)
VALUES ('11111111-1111-1111-1111-111111111111', 'Solum Technologies', 'solum-technologies', 'professional')
ON CONFLICT (slug) DO NOTHING;

UPDATE tenants
SET name = 'Solum Technologies', slug = 'solum-technologies'
WHERE id = '11111111-1111-1111-1111-111111111111';

INSERT INTO departments (id, tenant_id, name, cost_center) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Engineering', 'CC-100'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Operations', 'CC-200'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Finance', 'CC-300')
ON CONFLICT DO NOTHING;

INSERT INTO vendors (id, tenant_id, name, contact_email, website) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Dell Technologies', 'sales@dell.com', 'https://dell.com'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Apple Inc.', 'enterprise@apple.com', 'https://apple.com'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'HP Inc.', 'business@hp.com', 'https://hp.com')
ON CONFLICT DO NOTHING;
