import { type PlanTier, stripePriceIdForTier } from './plans';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

function credentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith('rzp_') || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured');
  }
  return { keyId, keySecret };
}

function authHeader(): string {
  const { keyId, keySecret } = credentials();
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

async function razorpayRequest<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(data.error?.description ?? `Razorpay API error (${res.status})`);
  }
  return data;
}

export function razorpayPlanIdForTier(tier: PlanTier): string | null {
  const envKey = `RAZORPAY_PLAN_${tier.toUpperCase()}` as keyof NodeJS.ProcessEnv;
  const id = process.env[envKey];
  return id && id.startsWith('plan_') ? id : null;
}

export async function createRazorpaySubscription(opts: {
  tier: PlanTier;
  tenantId: string;
  customerEmail: string;
  customerName: string;
}): Promise<string> {
  const planId = razorpayPlanIdForTier(opts.tier);
  if (!planId) {
    throw new Error(`Razorpay plan not configured for ${opts.tier}. Set RAZORPAY_PLAN_${opts.tier.toUpperCase()}.`);
  }

  const subscription = await razorpayRequest<{ id: string; short_url?: string }>('POST', '/subscriptions', {
    plan_id: planId,
    total_count: 120,
    customer_notify: 1,
    quantity: 1,
    notes: {
      tenant_id: opts.tenantId,
      plan_tier: opts.tier,
      customer_email: opts.customerEmail,
      customer_name: opts.customerName,
    },
  });

  if (!subscription.short_url) {
    throw new Error('Razorpay did not return a subscription checkout URL');
  }
  return subscription.short_url;
}

/** Verify Razorpay webhook signature (HMAC SHA256). */
export async function verifyRazorpayWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
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

export interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    subscription?: {
      entity?: {
        id: string;
        status: string;
        notes?: { tenant_id?: string; plan_tier?: string };
      };
    };
  };
}

export function parseRazorpayEvent(body: string): RazorpayWebhookPayload {
  return JSON.parse(body) as RazorpayWebhookPayload;
}

export function mapRazorpayStatus(status: string): 'active' | 'past_due' | 'canceled' | 'trial' {
  if (status === 'active') return 'active';
  if (status === 'authenticated' || status === 'created') return 'trial';
  if (status === 'halted' || status === 'pending') return 'past_due';
  return 'canceled';
}
