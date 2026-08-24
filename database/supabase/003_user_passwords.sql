-- Optional password overrides for demo users (Tier 1 auth)
CREATE TABLE IF NOT EXISTS user_passwords (
  email VARCHAR(255) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
