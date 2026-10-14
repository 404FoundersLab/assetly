-- 018 — Add Tenant Admin and Platform Admin accounts for Solum Group

-- 1. Insert or update users in the users table
INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
VALUES
  (
    '11111111-1111-1111-1111-111111111198',
    '11111111-1111-1111-1111-111111111111',
    'itadmin.sti@solum-group.com',
    'Pavan',
    'Admin',
    'tenant_admin'
  ),
  (
    '11111111-1111-1111-1111-111111111199',
    '11111111-1111-1111-1111-111111111111',
    'pramod.sv@solum-group.com',
    'Pramod',
    'Admin',
    'platform_admin'
  )
ON CONFLICT (email) DO UPDATE
  SET role = EXCLUDED.role,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      tenant_id = EXCLUDED.tenant_id;

-- 2. Insert or update passwords in the user_passwords table
INSERT INTO user_passwords (email, password_hash, updated_at)
VALUES
  (
    'itadmin.sti@solum-group.com',
    'pbkdf2v1:64d154d26b6e0c63d002104716bcec52:d66c2a136e24769994bb2c07701237126e6d807dd078da96a37ff57319fd2fe9',
    NOW()
  ),
  (
    'pramod.sv@solum-group.com',
    'pbkdf2v1:0c358689e697f80a1d0d0607b88d2da3:502ad605878acfcaf8ec4d326ba80dc73a70b8d2f2dc177d3a6d7842c95216a2',
    NOW()
  )
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      updated_at = NOW();
