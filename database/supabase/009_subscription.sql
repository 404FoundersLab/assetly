-- Subscription & billing columns for Assetly tenants
-- Run in Neon SQL Editor after prior migrations

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL UNIQUE,
  max_assets INT NOT NULL DEFAULT 100,
  max_admins INT NOT NULL DEFAULT 3,
  max_endpoints INT NOT NULL DEFAULT 100,
  price_per_unit DECIMAL(10,2) NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_assets INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  ALTER COLUMN price_per_endpoint DROP NOT NULL;

INSERT INTO subscription_plans (id, name, tier, max_assets, max_admins, max_endpoints, price_per_unit, features)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Starter',
    'starter',
    100,
    3,
    100,
    2.00,
    '["asset_management","qr_codes","audit_90d"]'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Professional',
    'professional',
    1000,
    15,
    1000,
    4.00,
    '["asset_management","endpoint_monitoring","remote_management","audit_1y","api_full"]'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Enterprise',
    'enterprise',
    999999,
    999999,
    999999,
    0.00,
    '["all_features","sso","audit_7y","dedicated_support"]'
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');

-- Link existing tenants to plans by name
UPDATE tenants t
SET subscription_plan_id = sp.id,
    subscription_status = COALESCE(t.subscription_status, 'active'),
    trial_ends_at = COALESCE(t.trial_ends_at, NOW() + INTERVAL '14 days')
FROM subscription_plans sp
WHERE LOWER(t.plan::text) = sp.tier::text
  AND t.subscription_plan_id IS NULL;

UPDATE tenants t
SET subscription_plan_id = sp.id
FROM subscription_plans sp
WHERE sp.tier::text = 'professional'
  AND t.subscription_plan_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
