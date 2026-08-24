import { getSql, getTenantSql } from './db';
import {
  type PlanDefinition,
  type PlanTier,
  getPlanByTier,
  getPlanFromName,
  normalizeTier,
  PLAN_CATALOG,
} from './plans';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';

export interface TenantSubscription {
  tenantId: string;
  plan: PlanDefinition;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  razorpaySubscriptionId: string | null;
  billingRegion: 'IN' | 'GLOBAL';
  usage: {
    assets: number;
    admins: number;
    endpoints: number;
  };
}

interface DbTenantBilling {
  id: string;
  plan: string;
  subscription_status: string | null;
  subscription_plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  razorpay_subscription_id: string | null;
  billing_region: string | null;
  trial_ends_at: string | null;
  tier?: string | null;
  max_assets?: number | null;
  max_admins?: number | null;
  max_endpoints?: number | null;
  price_per_unit?: string | number | null;
  plan_name?: string | null;
}


export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription> {
  const plan = getPlanFromName('professional');
  const fallback: TenantSubscription = {
    tenantId,
    plan,
    status: 'trial',
    trialEndsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    razorpaySubscriptionId: null,
    billingRegion: 'IN',
    usage: { assets: 0, admins: 0, endpoints: 0 },
  };

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        t.id,
        t.plan,
        t.subscription_status,
        t.subscription_plan_id,
        t.stripe_customer_id,
        t.stripe_subscription_id,
        t.razorpay_subscription_id,
        t.billing_region,
        t.trial_ends_at,
        sp.tier,
        sp.max_assets,
        sp.max_admins,
        sp.max_endpoints,
        sp.price_per_unit,
        sp.name AS plan_name
      FROM tenants t
      LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
      WHERE t.id = ${tenantId}
      LIMIT 1
    ` as DbTenantBilling[];

    const row = rows[0];
    if (!row) return fallback;

    const tier = normalizeTier(row.tier ?? row.plan);
    const catalogPlan = getPlanByTier(tier);
    const resolvedPlan: PlanDefinition = {
      ...catalogPlan,
      maxAssets: row.max_assets ?? catalogPlan.maxAssets,
      maxAdmins: row.max_admins ?? catalogPlan.maxAdmins,
      maxEndpoints: row.max_endpoints ?? catalogPlan.maxEndpoints,
      pricePerUnit: row.price_per_unit != null ? Number(row.price_per_unit) : catalogPlan.pricePerUnit,
      name: row.plan_name ?? catalogPlan.name,
    };

    const usage = await getTenantUsage(tenantId);

    return {
      tenantId: row.id,
      plan: resolvedPlan,
      status: (row.subscription_status as SubscriptionStatus) ?? 'trial',
      trialEndsAt: row.trial_ends_at,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      razorpaySubscriptionId: row.razorpay_subscription_id ?? null,
      billingRegion: row.billing_region === 'GLOBAL' ? 'GLOBAL' : 'IN',
      usage,
    };
  } catch {
    return { ...fallback, usage: await getTenantUsage(tenantId).catch(() => fallback.usage) };
  }
}

async function getTenantUsage(tenantId: string): Promise<TenantSubscription['usage']> {
  let assets = 0;
  let admins = 0;
  let endpoints = 0;

  const mainSql = getSql();

  try {
    const tenantSql = await getTenantSql(tenantId);
    const assetRows = await tenantSql`
      SELECT COUNT(*)::int AS count FROM assets WHERE tenant_id = ${tenantId}
    ` as { count: number }[];
    assets = assetRows[0]?.count ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const adminRows = await mainSql`
      SELECT COUNT(*)::int AS count FROM users
      WHERE tenant_id = ${tenantId}
        AND role IN ('tenant_admin', 'it_admin', 'platform_admin')
    ` as { count: number }[];
    admins = adminRows[0]?.count ?? 0;
  } catch {
    /* ignore */
  }

  try {
    const tenantSql = await getTenantSql(tenantId);
    const endpointRows = await tenantSql`
      SELECT COUNT(*)::int AS count FROM endpoints WHERE tenant_id = ${tenantId}
    ` as { count: number }[];
    endpoints = endpointRows[0]?.count ?? 0;
  } catch {
    /* endpoints table optional in phase 1 */
  }

  return { assets, admins, endpoints };
}

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  current: number;
  limit: number;
}

export function isTrialExpired(trialEndsAt: string | null, status: SubscriptionStatus): boolean {
  if (status === 'active') return false;
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < Date.now();
}

export async function assertSubscriptionActive(tenantId: string): Promise<LimitCheckResult> {
  const sub = await getTenantSubscription(tenantId);
  if (sub.status === 'suspended' || sub.status === 'canceled') {
    return {
      allowed: false,
      message: 'Subscription is inactive. Upgrade or renew to continue.',
      current: 0,
      limit: 0,
    };
  }
  if (isTrialExpired(sub.trialEndsAt, sub.status) && sub.status === 'trial') {
    return {
      allowed: false,
      message: 'Trial expired. Upgrade your plan to continue.',
      current: 0,
      limit: 0,
    };
  }
  return { allowed: true, current: 0, limit: 0 };
}

export async function checkAssetLimit(tenantId: string): Promise<LimitCheckResult> {
  const active = await assertSubscriptionActive(tenantId);
  if (!active.allowed) return active;

  const sub = await getTenantSubscription(tenantId);
  const limit = sub.plan.maxAssets;
  const current = sub.usage.assets;

  if (current >= limit) {
    return {
      allowed: false,
      message: `Asset limit reached (${current}/${limit}). Upgrade your ${sub.plan.name} plan.`,
      current,
      limit,
    };
  }
  return { allowed: true, current, limit };
}

export async function checkAdminLimit(tenantId: string): Promise<LimitCheckResult> {
  const active = await assertSubscriptionActive(tenantId);
  if (!active.allowed) return active;

  const sub = await getTenantSubscription(tenantId);
  const limit = sub.plan.maxAdmins;
  const current = sub.usage.admins;

  if (current >= limit) {
    return {
      allowed: false,
      message: `Admin seat limit reached (${current}/${limit}). Upgrade your plan.`,
      current,
      limit,
    };
  }
  return { allowed: true, current, limit };
}

export async function applyPlanToTenant(tenantId: string, tier: PlanTier, status: SubscriptionStatus = 'active') {
  const plan = getPlanByTier(tier);
  const sql = getSql();
  await sql`
    UPDATE tenants SET
      plan = ${plan.name},
      subscription_plan_id = ${plan.id},
      subscription_status = ${status},
      trial_ends_at = CASE WHEN ${status} = 'trial' THEN COALESCE(trial_ends_at, NOW() + INTERVAL '14 days') ELSE trial_ends_at END
    WHERE id = ${tenantId}
  `;
}

export function listPublicPlans() {
  return Object.values(PLAN_CATALOG).map((p) => ({
    tier: p.tier,
    name: p.name,
    maxAssets: p.maxAssets,
    maxAdmins: p.maxAdmins,
    maxEndpoints: p.maxEndpoints,
    pricePerUnit: p.pricePerUnit,
    featureLabels: p.featureLabels,
  }));
}

/** @deprecated use listPublicPlansForRegion from plans.ts */

export function appBaseUrl(req: Request): string {
  const configured = process.env.APP_URL ?? process.env.VERCEL_URL;
  if (configured) {
    return configured.startsWith('http') ? configured : `https://${configured}`;
  }
  const host = req.headers.get('host');
  if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
    return `http://${host.replace(/:\d+$/, '')}:5173`;
  }
  return host ? `https://${host}` : 'http://localhost:5173';
}


