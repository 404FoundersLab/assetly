import { json, error, corsPreflight } from '../_lib/db';
import { requireAuth, resolveBillingTenantId } from '../_lib/auth';
import { buildBillingOverview } from '../_lib/billing-provider';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  const tenantId = resolveBillingTenantId(auth);
  if (!tenantId) return error('Tenant context required', 400);

  const overview = await buildBillingOverview(tenantId);
  return json(overview);
}
