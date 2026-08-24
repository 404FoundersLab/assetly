-- Dual-provider billing: Razorpay (India) + Stripe (global)
-- Run after 009_subscription.sql

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_region VARCHAR(10) NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

UPDATE tenants SET billing_region = 'IN' WHERE billing_region IS NULL OR billing_region = '';

CREATE INDEX IF NOT EXISTS idx_tenants_razorpay_sub ON tenants(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

COMMENT ON COLUMN tenants.billing_region IS 'IN = Razorpay (India), GLOBAL = Stripe (international)';
