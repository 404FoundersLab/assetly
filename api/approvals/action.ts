import { corsPreflight, error, getTenantSql, json } from '../_lib/db';
import { validateBody, z } from '../_lib/validate';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import { processApprovalAction } from '../_lib/workflow-engine';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'POST') {
      const parsed = await validateBody(req, z.object({
        approvalRequestId: z.string().max(128).optional(),
        id: z.string().max(128).optional(),
        action: z.string().max(16),
        comment: z.string().max(2000).optional(),
      }));
      if (!parsed.ok) return parsed.response;
      const body: Record<string, unknown> = parsed.data;
      const approvalRequestId = String(body.approvalRequestId ?? body.id ?? '').trim();
      const action = String(body.action ?? '').trim().toLowerCase();
      const comment = body.comment ? String(body.comment).trim() : undefined;

      if (!approvalRequestId) return error('approvalRequestId is required', 400);
      if (action !== 'approve' && action !== 'reject') {
        return error("action must be 'approve' or 'reject'", 400);
      }

      const result = await processApprovalAction(sql, {
        tenantId: auth.tenantId!,
        approvalRequestId,
        actor: auth,
        action: action as 'approve' | 'reject',
        comment,
      });

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        entityType: 'approval_request',
        entityId: approvalRequestId,
        details: `${auth.role} ${action}d request stage${comment ? `: ${comment}` : ''}`,
      });

      return json(result);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Approval action failed';
    const status = msg.includes('Forbidden') || msg.includes('prevented') ? 403 : 400;
    return error(msg, status);
  }
}

