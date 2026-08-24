import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, resolveBillingTenantId, canManageBilling } from '../_lib/auth';
import { type PlanTier, normalizeTier } from '../_lib/plans';
import { startBillingCheckout } from '../_lib/billing-provider';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  if (!canManageBilling(auth.role)) {
    return error('Only tenant admins can manage billing', 403);
  }
  const tenantId = resolveBillingTenantId(auth);
  if (!tenantId) return error('Tenant context required', 400);

  const body = await parseBody<{ tier?: string }>(req);
  const tier = normalizeTier(body.tier) as PlanTier;

  if (tier === 'enterprise') {
    return error('Contact sales for Enterprise pricing', 400);
  }

  try {
    const result = await startBillingCheckout(req, tenantId, tier, auth.email);
    return json(result);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Checkout failed', 500);
  }
}
