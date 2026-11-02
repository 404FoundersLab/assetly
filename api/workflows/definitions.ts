import { corsPreflight, error, getTenantSql, json, parseBody } from '../_lib/db';
import { requireAuth } from '../_lib/auth';
import { canManageUsers } from '../_lib/roles';
import { ensureWorkflowTables, getOrCreateWorkflowDefinition } from '../_lib/workflow-engine';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);
  await ensureWorkflowTables(sql);

  try {
    if (req.method === 'GET') {
      const modules = ['leave_request', 'asset_request', 'purchase_request'];
      const definitions = await Promise.all(
        modules.map(async (mod) => {
          const res = await getOrCreateWorkflowDefinition(sql, auth.tenantId!, mod);
          return {
            ...res.definition,
            steps: res.steps,
          };
        })
      );
      return json(definitions);
    }

    if (req.method === 'PUT') {
      if (!canManageUsers(auth.role)) {
        return error('Forbidden — Tenant Admin privileges required to configure workflows', 403);
      }

      const body = await parseBody<Record<string, any>>(req);
      const module = String(body.module ?? '').trim();
      if (!module) return error('Workflow module name is required', 400);

      const { definition } = await getOrCreateWorkflowDefinition(sql, auth.tenantId!, module);

      // Update definition settings
      const fallbackApproverId = body.fallbackApproverId ? String(body.fallbackApproverId) : null;
      const fallbackApproverRole = body.fallbackApproverRole ? String(body.fallbackApproverRole) : 'tenant_admin';
      const alternateApproverId = body.alternateApproverId ? String(body.alternateApproverId) : null;
      const alternateApproverRole = body.alternateApproverRole ? String(body.alternateApproverRole) : 'tenant_admin';
      const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

      await sql`
        UPDATE workflow_definitions
        SET
          fallback_approver_id = ${fallbackApproverId},
          fallback_approver_role = ${fallbackApproverRole},
          alternate_approver_id = ${alternateApproverId},
          alternate_approver_role = ${alternateApproverRole},
          is_active = ${isActive},
          updated_at = NOW()
        WHERE id = ${definition.id} AND tenant_id = ${auth.tenantId!}
      `;

      // If custom steps are passed in body
      if (Array.isArray(body.steps) && body.steps.length > 0) {
        await sql`DELETE FROM workflow_steps WHERE workflow_id = ${definition.id}`;
        for (let i = 0; i < body.steps.length; i++) {
          const step = body.steps[i];
          const order = i + 1;
          const stepName = String(step.stepName || `Level ${order} Approval`).trim();
          const approverType = String(step.approverType || 'role').trim();
          const approverRole = step.approverRole ? String(step.approverRole).trim() : null;
          const approverUserId = step.approverUserId ? String(step.approverUserId).trim() : null;
          const isRequired = step.isRequired !== undefined ? Boolean(step.isRequired) : true;
          const autoSkipIfSubmitter = step.autoSkipIfSubmitter !== undefined ? Boolean(step.autoSkipIfSubmitter) : true;

          await sql`
            INSERT INTO workflow_steps (
              workflow_id, step_order, step_name, approver_type, approver_role,
              approver_user_id, is_required, auto_skip_if_submitter
            ) VALUES (
              ${definition.id}, ${order}, ${stepName}, ${approverType},
              ${approverRole}, ${approverUserId}, ${isRequired}, ${autoSkipIfSubmitter}
            )
          `;
        }
      }

      const updated = await getOrCreateWorkflowDefinition(sql, auth.tenantId!, module);
      return json({
        ...updated.definition,
        steps: updated.steps,
      });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Workflow configuration failed';
    return error(msg, 500);
  }
}

