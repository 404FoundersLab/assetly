import { corsPreflight, error, getTenantSql, json, parseBody } from '../_lib/db';
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
      const body = await parseBody<Record<string, unknown>>(req);
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

