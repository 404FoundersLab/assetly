import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, insertAuditLog, canManageHrLeave } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);
  const isHrAdmin = canManageHrLeave(auth.role);
  const selfEmployeeId = auth.employeeId ?? null;

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const employeeId = url.searchParams.get('employeeId');

      if (!isHrAdmin) {
        if (!selfEmployeeId) return error('Forbidden', 403);
        if (employeeId && employeeId !== selfEmployeeId) return error('Forbidden', 403);
      }

      let rows;
      if (employeeId) {
        rows = await sql`
          SELECT * FROM hr_leave_requests 
          WHERE tenant_id = ${auth.tenantId!} AND employee_id = ${employeeId} AND deleted_at IS NULL
          ORDER BY created_at DESC
        ` as Record<string, any>[];
      } else if (isHrAdmin) {
        rows = await sql`
          SELECT * FROM hr_leave_requests 
          WHERE tenant_id = ${auth.tenantId!} AND deleted_at IS NULL
          ORDER BY created_at DESC
        ` as Record<string, any>[];
      } else {
        rows = await sql`
          SELECT * FROM hr_leave_requests 
          WHERE tenant_id = ${auth.tenantId!} AND employee_id = ${selfEmployeeId} AND deleted_at IS NULL
          ORDER BY created_at DESC
        ` as Record<string, any>[];
      }

      return json(rows.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        leaveType: row.leave_type,
        startDate: row.start_date,
        endDate: row.end_date,
        daysCount: row.days_count,
        reason: row.reason,
        status: row.status,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
      })));
    }

    if (req.method === 'POST') {
      const body = await parseBody<Record<string, unknown>>(req);
      const employeeId = String(body.employeeId ?? '').trim();
      const leaveType = String(body.leaveType ?? '').trim();
      const startDate = String(body.startDate ?? '').trim();
      const endDate = String(body.endDate ?? '').trim();
      const daysCount = Number(body.daysCount ?? 0);
      const reason = body.reason ? String(body.reason) : null;

      if (!employeeId || !leaveType || !startDate || !endDate || daysCount <= 0) {
        return error('Missing required fields for leave request', 400);
      }

      if (!isHrAdmin) {
        if (!selfEmployeeId || employeeId !== selfEmployeeId) {
          return error('Forbidden — you can only create leave for yourself', 403);
        }
      }

      const id = crypto.randomUUID();
      const rows = await sql`
        INSERT INTO hr_leave_requests (
          id, tenant_id, employee_id, leave_type, start_date, end_date, days_count, reason, status
        ) VALUES (
          ${id}, ${auth.tenantId!}, ${employeeId}, ${leaveType}, ${startDate}, ${endDate}, ${daysCount}, ${reason}, 'pending'
        )
        RETURNING *
      ` as Record<string, any>[];

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'leave_request',
        entityId: id,
        entityLabel: `Leave Request (${leaveType})`,
        details: `Created leave request for ${daysCount} days`,
      });

      const row = rows[0];
      return json({
        id: row.id,
        employeeId: row.employee_id,
        leaveType: row.leave_type,
        startDate: row.start_date,
        endDate: row.end_date,
        daysCount: row.days_count,
        reason: row.reason,
        status: row.status,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
      }, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}
