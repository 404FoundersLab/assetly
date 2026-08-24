import type { BillingOverview, PlanTier } from '../../types';
import { apiFetch } from './client';

export async function fetchBillingOverview(): Promise<BillingOverview> {
  return apiFetch('/api/billing/subscription');
}

export async function startCheckout(tier: PlanTier): Promise<{ url?: string; redirectUrl?: string; mode: string; message?: string }> {
  return apiFetch('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

export async function openBillingPortal(): Promise<{ url: string }> {
  return apiFetch('/api/billing/portal', { method: 'POST' });
}
