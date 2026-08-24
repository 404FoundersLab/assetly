export type PlanTier = 'starter' | 'professional' | 'enterprise';
export type BillingRegion = 'IN' | 'GLOBAL';
export type BillingProvider = 'razorpay' | 'stripe';
export type BillingMode = 'demo' | 'stripe' | 'razorpay' | 'dual';

export interface PlanDefinition {
  id: string;
  tier: PlanTier;
  name: string;
  maxAssets: number;
  maxAdmins: number;
  maxEndpoints: number;
  pricePerUnit: number;
  features: string[];
  featureLabels: string[];
}

/** Canonical plan catalog — used when DB table is unavailable and for Stripe price mapping. */
export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  starter: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    tier: 'starter',
    name: 'Starter',
    maxAssets: 100,
    maxAdmins: 3,
    maxEndpoints: 100,
    pricePerUnit: 2,
    features: ['asset_management', 'qr_codes', 'audit_90d'],
    featureLabels: ['Asset management', 'QR codes', '90-day audit retention'],
  },
  professional: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    tier: 'professional',
    name: 'Professional',
    maxAssets: 1000,
    maxAdmins: 15,
    maxEndpoints: 1000,
    pricePerUnit: 4,
    features: ['asset_management', 'endpoint_monitoring', 'remote_management', 'audit_1y', 'api_full'],
    featureLabels: [
      'Everything in Starter',
      'Endpoint monitoring',
      'Remote management',
      '1-year audit retention',
      'Full API access',
    ],
  },
  enterprise: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    tier: 'enterprise',
    name: 'Enterprise',
    maxAssets: 999999,
    maxAdmins: 999999,
    maxEndpoints: 999999,
    pricePerUnit: 0,
    features: ['all_features', 'sso', 'audit_7y', 'dedicated_support'],
    featureLabels: ['All features', 'SSO / SAML', '7-year audit retention', 'Dedicated support'],
  },
};

export function normalizeTier(value: string | null | undefined): PlanTier {
  const key = String(value ?? 'professional').toLowerCase().trim();
  if (key === 'starter') return 'starter';
  if (key === 'enterprise') return 'enterprise';
  return 'professional';
}

export function getPlanByTier(tier: PlanTier): PlanDefinition {
  return PLAN_CATALOG[tier];
}

export function getPlanFromName(planName: string | null | undefined): PlanDefinition {
  return getPlanByTier(normalizeTier(planName));
}

export function stripePriceIdForTier(tier: PlanTier): string | null {
  const envKey = `STRIPE_PRICE_${tier.toUpperCase()}` as keyof NodeJS.ProcessEnv;
  const id = process.env[envKey];
  return id && id.startsWith('price_') ? id : null;
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key.startsWith('sk_test_') || key.startsWith('sk_live_');
}

export function isRazorpayConfigured(): boolean {
  const id = process.env.RAZORPAY_KEY_ID ?? '';
  const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
  return id.startsWith('rzp_') && secret.length > 0;
}

/** Overall platform billing capability. */
export function billingPlatformMode(): BillingMode {
  const stripe = isStripeConfigured();
  const razorpay = isRazorpayConfigured();
  if (stripe && razorpay) return 'dual';
  if (stripe) return 'stripe';
  if (razorpay) return 'razorpay';
  return 'demo';
}

/** @deprecated use billingPlatformMode */
export function billingMode(): BillingMode {
  return billingPlatformMode();
}

export function resolveProvider(region: BillingRegion): BillingProvider {
  return region === 'IN' ? 'razorpay' : 'stripe';
}

export function isProviderConfigured(provider: BillingProvider): boolean {
  return provider === 'razorpay' ? isRazorpayConfigured() : isStripeConfigured();
}

export function normalizeBillingRegion(value: string | null | undefined): BillingRegion {
  return String(value ?? 'IN').toUpperCase() === 'GLOBAL' ? 'GLOBAL' : 'IN';
}

export function inrPerUsd(): number {
  const rate = Number(process.env.BILLING_INR_USD_RATE ?? 83);
  return Number.isFinite(rate) && rate > 0 ? rate : 83;
}

export function formatPlanPrice(tier: PlanTier, region: BillingRegion) {
  const plan = getPlanByTier(tier);
  if (region === 'IN') {
    const displayPrice = Math.round(plan.pricePerUnit * inrPerUsd());
    return { currency: 'INR' as const, displayPrice, priceLabel: `₹${displayPrice}/asset/month` };
  }
  return { currency: 'USD' as const, displayPrice: plan.pricePerUnit, priceLabel: `$${plan.pricePerUnit}/asset/month` };
}

export function listPublicPlansForRegion(region: BillingRegion) {
  return Object.values(PLAN_CATALOG).map((p) => ({
    tier: p.tier,
    name: p.name,
    maxAssets: p.maxAssets,
    maxAdmins: p.maxAdmins,
    maxEndpoints: p.maxEndpoints,
    pricePerUnit: p.pricePerUnit,
    featureLabels: p.featureLabels,
    ...formatPlanPrice(p.tier, region),
  }));
}
