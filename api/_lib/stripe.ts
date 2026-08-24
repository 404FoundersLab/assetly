import { type PlanTier, stripePriceIdForTier } from './plans';

const STRIPE_API = 'https://api.stripe.com/v1';

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return key;
}

function formBody(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.join('&');
}

async function stripeRequest<T>(
  method: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const url = `${STRIPE_API}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (params && (method === 'POST' || method === 'PATCH')) {
    init.body = formBody(params);
  }
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Stripe API error (${res.status})`);
  }
  return data;
}

export async function createStripeCustomer(email: string, name: string, tenantId: string): Promise<string> {
  const customer = await stripeRequest<{ id: string }>('POST', '/customers', {
    email,
    name,
    'metadata[tenant_id]': tenantId,
  });
  return customer.id;
}

export async function createCheckoutSession(opts: {
  customerId: string;
  tier: PlanTier;
  tenantId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const priceId = stripePriceIdForTier(opts.tier);
  if (!priceId) {
    throw new Error(`Stripe price not configured for ${opts.tier}. Set STRIPE_PRICE_${opts.tier.toUpperCase()}.`);
  }

  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: 'subscription',
    customer: opts.customerId,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': 1,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    'subscription_data[metadata][tenant_id]': opts.tenantId,
    'subscription_data[metadata][plan_tier]': opts.tier,
    'metadata[tenant_id]': opts.tenantId,
    'metadata[plan_tier]': opts.tier,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripeRequest<{ url: string }>('POST', '/billing_portal/sessions', {
    customer: customerId,
    return_url: returnUrl,
  });
  if (!session.url) throw new Error('Stripe did not return a portal URL');
  return session.url;
}

/** Verify Stripe webhook signature (HMAC SHA256). */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<boolean> {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface StripeSubscriptionEvent {
  id: string;
  status: string;
  customer: string;
  metadata?: { tenant_id?: string; plan_tier?: string };
}

export function parseStripeEvent(body: string): {
  type: string;
  data: { object: StripeSubscriptionEvent };
} {
  return JSON.parse(body) as {
    type: string;
    data: { object: StripeSubscriptionEvent };
  };
}
