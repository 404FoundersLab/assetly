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

      if (!isHrAdmin && employeeId && employeeId !== selfEmployeeId) {
        return error('Forbidden — you can only view your own leave balance', 403);
      }

      // Fetch employees to return balances for
      let employeesQuery;
      if (employeeId) {
        employeesQuery = sql`SELECT id, first_name, last_name, job_title, department_id FROM employees WHERE id = ${employeeId} AND tenant_id = ${auth.tenantId!}`;
      } else if (!isHrAdmin && selfEmployeeId) {
        employeesQuery = sql`SELECT id, first_name, last_name, job_title, department_id FROM employees WHERE id = ${selfEmployeeId} AND tenant_id = ${auth.tenantId!}`;
      } else {
        employeesQuery = sql`SELECT id, first_name, last_name, job_title, department_id FROM employees WHERE tenant_id = ${auth.tenantId!} ORDER BY first_name ASC`;
      }

      const emps = await employeesQuery as Record<string, any>[];

      // Try fetching balances from hr_leave_balances
      let dbBalances: Record<string, any>[] = [];
      try {
        dbBalances = await sql`
          SELECT * FROM hr_leave_balances WHERE tenant_id = ${auth.tenantId!} AND year = 2026
        ` as Record<string, any>[];
      } catch {
        /* table may be empty or not yet seeded */
      }

      // Merge and calculate balances per employee
      const result = emps.map((emp) => {
        const empRows = dbBalances.filter((b) => b.employee_id === emp.id);

        const getQuota = (type: string, defAlloc: number) => {
          const row = empRows.find((r) => r.leave_type === type);
          return {
            allocated: Number(row?.allocated_days ?? defAlloc),
            used: Number(row?.used_days ?? 0),
            pending: Number(row?.pending_days ?? 0),
          };
        };

        const casual = getQuota('casual', 12);
        const sick = getQuota('sick', 12);
        const earned = getQuota('earned', 18);
        const compOff = getQuota('comp_off', 5);
        const maternity = getQuota('maternity', 180);

        return {
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name || ''}`.trim(),
          jobTitle: emp.job_title || 'Team Member',
          departmentId: emp.department_id,
          year: 2026,
          casualTotal: casual.allocated,
          casualUsed: casual.used,
          casualPending: casual.pending,
          sickTotal: sick.allocated,
          sickUsed: sick.used,
          sickPending: sick.pending,
          earnedTotal: earned.allocated,
          earnedUsed: earned.used,
          earnedPending: earned.pending,
          compOffTotal: compOff.allocated,
          compOffUsed: compOff.used,
          compOffPending: compOff.pending,
          maternityTotal: maternity.allocated,
          maternityUsed: maternity.used,
          maternityPending: maternity.pending,
        };
      });

      return json(result);
    }

    if (req.method === 'POST') {
      if (!isHrAdmin) return error('Forbidden — HR admin required to adjust leave balances', 403);

      const body = await parseBody<Record<string, unknown>>(req);
      const employeeId = String(body.employeeId ?? '').trim();
      const leaveType = String(body.leaveType ?? 'casual').trim();
      const allocatedDays = Number(body.allocatedDays ?? 12);
      const reason = body.reason ? String(body.reason).trim() : 'Manual balance adjustment';

      if (!employeeId || !leaveType) {
        return error('Employee ID and leave type required', 400);
      }

      try {
        await sql`
          INSERT INTO hr_leave_balances (
            tenant_id, employee_id, year, leave_type, allocated_days, updated_at
          ) VALUES (
            ${auth.tenantId!}, ${employeeId}, 2026, ${leaveType}, ${allocatedDays}, NOW()
          )
          ON CONFLICT (tenant_id, employee_id, year, leave_type)
          DO UPDATE SET allocated_days = ${allocatedDays}, updated_at = NOW()
        `;
      } catch {
        /* table might not exist yet */
      }

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'leave_balance',
        entityId: employeeId,
        details: `Adjusted ${leaveType} leave quota to ${allocatedDays} days (${reason})`,
      });

      return json({ success: true, employeeId, leaveType, allocatedDays });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}
