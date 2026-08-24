import { getSql } from './db';
import {
  type PlanTier,
  type BillingRegion,
  type BillingProvider,
  billingPlatformMode,
  resolveProvider,
  isProviderConfigured,
  formatPlanPrice,
  listPublicPlansForRegion,
} from './plans';
import { createCheckoutSession, createStripeCustomer } from './stripe';
import { createRazorpaySubscription } from './razorpay';
import { createBillingPortalSession } from './stripe';
import { appBaseUrl, applyPlanToTenant, getTenantSubscription } from './subscription';
import { isBillingDemoModeEnabled } from './security';

export interface TenantBillingContext {
  tenantId: string;
  name: string;
  adminEmail: string | null;
  billingRegion: BillingRegion;
  provider: BillingProvider;
  stripeCustomerId: string | null;
  razorpaySubscriptionId: string | null;
}

export async function getTenantBillingContext(tenantId: string): Promise<TenantBillingContext | null> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, name, admin_email, billing_region, stripe_customer_id, razorpay_subscription_id
      FROM tenants WHERE id = ${tenantId} LIMIT 1
    ` as {
      id: string;
      name: string;
      admin_email: string | null;
      billing_region: string | null;
      stripe_customer_id: string | null;
      razorpay_subscription_id: string | null;
    }[];

    const row = rows[0];
    if (!row) return null;

    const billingRegion: BillingRegion = row.billing_region === 'GLOBAL' ? 'GLOBAL' : 'IN';
    return {
      tenantId: row.id,
      name: row.name,
      adminEmail: row.admin_email,
      billingRegion,
      provider: resolveProvider(billingRegion),
      stripeCustomerId: row.stripe_customer_id,
      razorpaySubscriptionId: row.razorpay_subscription_id,
    };
  } catch {
    return null;
  }
}

export function isLiveBillingAvailable(ctx: TenantBillingContext): boolean {
  return isProviderConfigured(ctx.provider);
}

export async function startBillingCheckout(
  req: Request,
  tenantId: string,
  tier: PlanTier,
  adminEmail: string,
): Promise<{ mode: string; url?: string; redirectUrl?: string; message?: string; provider?: BillingProvider }> {
  const base = appBaseUrl(req);
  const returnPath = '/settings?billing=success';
  const cancelPath = '/settings?billing=canceled';

  const ctx = await getTenantBillingContext(tenantId);
  if (!ctx) throw new Error('Tenant not found');

  if (!isLiveBillingAvailable(ctx)) {
    if (!isBillingDemoModeEnabled()) {
      throw new Error(
        'Billing is not configured for this tenant. Set Stripe/Razorpay keys, or BILLING_DEMO_MODE=true for demos only.',
      );
    }
    await applyPlanToTenant(tenantId, tier, 'active');
    return {
      mode: 'demo',
      provider: ctx.provider,
      message: `Plan updated to ${tier} (demo mode — no payment processed)`,
      redirectUrl: `${base}${returnPath}`,
    };
  }

  if (ctx.provider === 'razorpay') {
    const url = await createRazorpaySubscription({
      tier,
      tenantId,
      customerEmail: ctx.adminEmail ?? adminEmail,
      customerName: ctx.name,
    });
    return { mode: billingPlatformMode(), provider: 'razorpay', url };
  }

  const sql = getSql();
  let customerId = ctx.stripeCustomerId;
  if (!customerId) {
    customerId = await createStripeCustomer(ctx.adminEmail ?? adminEmail, ctx.name, tenantId);
    await sql`UPDATE tenants SET stripe_customer_id = ${customerId} WHERE id = ${tenantId}`;
  }

  const url = await createCheckoutSession({
    customerId,
    tier,
    tenantId,
    successUrl: `${base}${returnPath}`,
    cancelUrl: `${base}${cancelPath}`,
  });

  return { mode: billingPlatformMode(), provider: 'stripe', url };
}

export async function openBillingPortal(req: Request, tenantId: string): Promise<string> {
  const ctx = await getTenantBillingContext(tenantId);
  if (!ctx) throw new Error('Tenant not found');

  if (ctx.provider === 'razorpay') {
    throw new Error(
      'Razorpay subscriptions are managed via UPI/card mandate. Contact support to change or cancel.',
    );
  }

  if (!ctx.stripeCustomerId) {
    throw new Error('No billing account yet. Subscribe to a plan first.');
  }

  const base = appBaseUrl(req);
  return createBillingPortalSession(ctx.stripeCustomerId, `${base}/settings`);
}

export async function buildBillingOverview(tenantId: string) {
  const subscription = await getTenantSubscription(tenantId);
  const ctx = await getTenantBillingContext(tenantId);
  const billingRegion: BillingRegion = ctx?.billingRegion ?? 'IN';
  const provider = ctx?.provider ?? resolveProvider(billingRegion);

  const plans = listPublicPlansForRegion(billingRegion).map((p) => ({
    ...p,
    ...formatPlanPrice(p.tier, billingRegion),
  }));

  return {
    mode: billingPlatformMode(),
    provider,
    billingRegion,
    currency: billingRegion === 'IN' ? 'INR' : 'USD',
    plans,
    subscription: {
      tenantId: subscription.tenantId,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      billingRegion,
      provider,
      stripeCustomerId: subscription.stripeCustomerId,
      hasStripeSubscription: Boolean(subscription.stripeSubscriptionId),
      hasRazorpaySubscription: Boolean(subscription.razorpaySubscriptionId),
      plan: {
        tier: subscription.plan.tier,
        name: subscription.plan.name,
        maxAssets: subscription.plan.maxAssets,
        maxAdmins: subscription.plan.maxAdmins,
        maxEndpoints: subscription.plan.maxEndpoints,
        pricePerUnit: subscription.plan.pricePerUnit,
        featureLabels: subscription.plan.featureLabels,
        ...formatPlanPrice(subscription.plan.tier, billingRegion),
      },
      usage: subscription.usage,
    },
  };
}
