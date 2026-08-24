-- 011 — Additional demo accounts (multiple users per role; platform admin uses Solum tenant for FK)
INSERT INTO users (id, tenant_id, email, first_name, last_name, role) VALUES
  ('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'itadmin2@solumtechnologies.com', 'Alex', 'Thompson', 'it_admin'),
  ('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'hradmin2@solumtechnologies.com', 'Jordan', 'Smith', 'hr_admin'),
  ('11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111111', 'mike.johnson@solumtechnologies.com', 'Mike', 'Johnson', 'employee')
ON CONFLICT DO NOTHING;

INSERT INTO user_passwords (email, password_hash, updated_at) VALUES
  ('itadmin2@solumtechnologies.com', 'seed-placeholder', NOW()),
  ('hradmin2@solumtechnologies.com', 'seed-placeholder', NOW()),
  ('mike.johnson@solumtechnologies.com', 'seed-placeholder', NOW())
ON CONFLICT (email) DO NOTHING;
