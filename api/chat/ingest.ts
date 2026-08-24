import { json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth } from '../_lib/auth';
import { ingestKnowledge } from '../_lib/rag';
import type { HrPolicyDoc, LeaveTypeDoc } from '../_lib/hr-policy-chat';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (!auth.tenantId) return error('Tenant ID is required', 400);

  try {
    const body = await parseBody<{
      hrPolicies?: HrPolicyDoc[];
      leavePolicies?: LeaveTypeDoc[];
    }>(req);

    const result = await ingestKnowledge(auth.tenantId, body.hrPolicies, body.leavePolicies);
    return json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ingest failed';
    if (/does not exist|knowledge_chunks|vector/i.test(message)) {
      return error('RAG tables are not set up. Run: npx tsx scripts/migrate-013.ts', 503);
    }
    return error(message, 500);
  }
}
