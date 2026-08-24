import { getSql, json, error } from '../_lib/db';
import { normalizeTier, type PlanTier } from '../_lib/plans';
import { parseStripeEvent, verifyWebhookSignature } from '../_lib/stripe';
import { applyPlanToTenant } from '../_lib/subscription';

export const config = { runtime: 'edge' };

function mapStripeStatus(status: string): 'active' | 'past_due' | 'canceled' | 'trial' {
  if (status === 'active' || status === 'trialing') return status === 'trialing' ? 'trial' : 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  return 'canceled';
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return error('STRIPE_WEBHOOK_SECRET not configured', 503);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return error('Missing stripe-signature header', 400);

  const payload = await req.text();
  const valid = await verifyWebhookSignature(payload, signature, webhookSecret);
  if (!valid) return error('Invalid webhook signature', 400);

  const event = parseStripeEvent(payload);
  const sql = getSql();

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const sub = event.data.object;
    const tenantId = sub.metadata?.tenant_id;
    const tier = normalizeTier(sub.metadata?.plan_tier) as PlanTier;
    const status = mapStripeStatus(sub.status);

    if (tenantId) {
      await applyPlanToTenant(tenantId, tier, status);
      await sql`
        UPDATE tenants SET
          stripe_subscription_id = ${event.type === 'customer.subscription.deleted' ? null : sub.id},
          stripe_customer_id = COALESCE(stripe_customer_id, ${sub.customer}),
          subscription_status = ${status}
        WHERE id = ${tenantId}
      `;
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      customer?: string;
      subscription?: string;
      metadata?: { tenant_id?: string; plan_tier?: string };
    };
    const tenantId = session.metadata?.tenant_id;
    if (tenantId && session.customer) {
      const tier = normalizeTier(session.metadata?.plan_tier) as PlanTier;
      await applyPlanToTenant(tenantId, tier, 'active');
      await sql`
        UPDATE tenants SET
          stripe_customer_id = ${session.customer},
          stripe_subscription_id = ${session.subscription ?? null},
          subscription_status = 'active'
        WHERE id = ${tenantId}
      `;
    }
  }

  return json({ received: true });
}
