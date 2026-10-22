import { getTenantSql, json, error, corsPreflight, parseBody } from '../../_lib/db';
import { requireAuth, insertAuditLog, canManageHrLeave } from '../../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];
  if (!id || id === 'leave') return error('ID required', 400);

  const sql = await getTenantSql(auth.tenantId!);
  const isHrAdmin = canManageHrLeave(auth.role);
  const selfEmployeeId = auth.employeeId ?? null;

  try {
    if (req.method === 'PUT') {
      const body = await parseBody<Record<string, unknown>>(req);
      const action = String(body.action ?? '').trim(); // 'manager_review' | 'hr_review' | 'cancel'
      const status = String(body.status ?? '').trim(); // 'approved' | 'rejected' | 'cancelled'
      const comment = body.comment ? String(body.comment).trim() : null;

      // Verify request exists
      const existingRows = await sql`
        SELECT * FROM hr_leave_requests WHERE id = ${id} AND tenant_id = ${auth.tenantId!} AND deleted_at IS NULL LIMIT 1
      ` as Record<string, any>[];

      if (existingRows.length === 0) return error('Leave request not found', 404);
      const existing = existingRows[0];

      // 1. Employee Self-Cancellation
      if (action === 'cancel' || status === 'cancelled') {
        if (!isHrAdmin && (!selfEmployeeId || existing.employee_id !== selfEmployeeId)) {
          return error('Forbidden — only the applicant can cancel their request', 403);
        }
        if (existing.status !== 'pending' && existing.status !== 'pending_manager' && existing.status !== 'pending_hr') {
          return error('Cannot cancel a leave request that is already finalized', 400);
        }

        const rows = await sql`
          UPDATE hr_leave_requests
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
          RETURNING *
        ` as Record<string, any>[];

        await insertAuditLog({
          tenantId: auth.tenantId,
          userId: auth.sub,
          userName: `${auth.firstName} ${auth.lastName}`,
          action: 'CANCEL',
          entityType: 'leave_request',
          entityId: id,
          details: 'Employee cancelled pending leave request',
        });

        return json({ ...rows[0], status: 'cancelled' });
      }

      // 2. Reporting Lead / Manager Review
      if (action === 'manager_review') {
        const isManager = existing.manager_id === selfEmployeeId || isHrAdmin;
        if (!isManager) {
          return error('Forbidden — only the designated reporting lead or HR can review this request', 403);
        }

        const managerStatus = status === 'approved' ? 'approved' : 'rejected';
        const overallStatus = managerStatus === 'approved' ? 'pending_hr' : 'rejected';
        const reviewerName = `${auth.firstName} ${auth.lastName}`.trim();

        let updated: Record<string, any>;
        try {
          const rows = await sql`
            UPDATE hr_leave_requests
            SET 
              manager_status = ${managerStatus},
              manager_comment = ${comment},
              manager_name = ${reviewerName},
              reviewed_by_manager_at = NOW(),
              status = ${overallStatus},
              updated_at = NOW()
            WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
            RETURNING *
          ` as Record<string, any>[];
          updated = rows[0];
        } catch {
          const rows = await sql`
            UPDATE hr_leave_requests
            SET status = ${overallStatus}, updated_at = NOW()
            WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
            RETURNING *
          ` as Record<string, any>[];
          updated = rows[0];
        }

        await insertAuditLog({
          tenantId: auth.tenantId,
          userId: auth.sub,
          userName: reviewerName,
          action: 'REVIEW',
          entityType: 'leave_request',
          entityId: id,
          details: `Reporting Lead ${managerStatus} leave request${comment ? `: ${comment}` : ''}`,
        });

        return json(updated);
      }

      // 3. HR Admin Review / Final Sanction
      if (!isHrAdmin) {
        return error('Forbidden — HR privileges required for final approval', 403);
      }

      const finalStatus = status === 'approved' ? 'approved' : 'rejected';
      const reviewerName = `${auth.firstName} ${auth.lastName}`.trim();

      let updatedRow: Record<string, any>;
      try {
        const rows = await sql`
          UPDATE hr_leave_requests
          SET 
            hr_status = ${finalStatus},
            hr_comment = ${comment},
            approved_by = ${auth.sub},
            reviewed_by_hr_at = NOW(),
            status = ${finalStatus},
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
          RETURNING *
        ` as Record<string, any>[];
        updatedRow = rows[0];
      } catch {
        const rows = await sql`
          UPDATE hr_leave_requests
          SET status = ${finalStatus}, approved_by = ${auth.sub}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
          RETURNING *
        ` as Record<string, any>[];
        updatedRow = rows[0];
      }

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: reviewerName,
        action: 'UPDATE',
        entityType: 'leave_request',
        entityId: id,
        details: `HR marked leave request as ${finalStatus}${comment ? ` (${comment})` : ''}`,
      });

      return json(updatedRow);
    }

    if (req.method === 'DELETE') {
      const existing = await sql`
        SELECT employee_id, status FROM hr_leave_requests
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!} AND deleted_at IS NULL
        LIMIT 1
      ` as { employee_id: string; status: string }[];

      if (existing.length === 0) return error('Not found', 404);

      if (!isHrAdmin) {
        if (!selfEmployeeId || existing[0].employee_id !== selfEmployeeId) {
          return error('Forbidden', 403);
        }
        if (existing[0].status !== 'pending' && existing[0].status !== 'pending_manager' && existing[0].status !== 'pending_hr') {
          return error('Forbidden — only pending requests can be cancelled', 403);
        }
      }

      await sql`
        UPDATE hr_leave_requests
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
      `;

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'leave_request',
        entityId: id,
        details: 'Deleted leave request',
      });

      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}
