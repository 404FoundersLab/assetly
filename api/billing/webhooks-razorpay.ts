import { getSql, json, error } from '../_lib/db';
import { normalizeTier, type PlanTier } from '../_lib/plans';
import { parseRazorpayEvent, verifyRazorpayWebhookSignature, mapRazorpayStatus } from '../_lib/razorpay';
import { applyPlanToTenant } from '../_lib/subscription';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return error('RAZORPAY_WEBHOOK_SECRET not configured', 503);

  const signature = req.headers.get('x-razorpay-signature');
  if (!signature) return error('Missing x-razorpay-signature header', 400);

  const payload = await req.text();
  const valid = await verifyRazorpayWebhookSignature(payload, signature, webhookSecret);
  if (!valid) return error('Invalid webhook signature', 400);

  const event = parseRazorpayEvent(payload);
  const sql = getSql();

  const subEntity = event.payload?.subscription?.entity;
  if (!subEntity) return json({ received: true });

  const tenantId = subEntity.notes?.tenant_id;
  const tier = normalizeTier(subEntity.notes?.plan_tier) as PlanTier;

  if (
    event.event === 'subscription.activated' ||
    event.event === 'subscription.charged' ||
    event.event === 'subscription.updated'
  ) {
    if (tenantId) {
      const status = mapRazorpayStatus(subEntity.status);
      await applyPlanToTenant(tenantId, tier, status === 'trial' ? 'active' : status);
      await sql`
        UPDATE tenants SET
          razorpay_subscription_id = ${subEntity.id},
          subscription_status = ${status === 'trial' ? 'active' : status}
        WHERE id = ${tenantId}
      `;
    }
  }

  if (event.event === 'subscription.cancelled' || event.event === 'subscription.completed') {
    if (tenantId) {
      await sql`
        UPDATE tenants SET
          razorpay_subscription_id = NULL,
          subscription_status = 'canceled'
        WHERE id = ${tenantId}
      `;
    }
  }

  if (event.event === 'subscription.halted') {
    if (tenantId) {
      await sql`
        UPDATE tenants SET subscription_status = 'past_due' WHERE id = ${tenantId}
      `;
    }
  }

  return json({ received: true });
}
