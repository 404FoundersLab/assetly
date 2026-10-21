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
      const view = url.searchParams.get('view'); // 'team' | 'team_requests' | 'my' | 'all'

      let rows: Record<string, any>[] = [];

      // 1. Team availability view ("Who's away in my team / department")
      if (view === 'team') {
        let callerDeptId: string | null = null;
        if (selfEmployeeId) {
          const emp = await sql`
            SELECT department_id FROM employees WHERE id = ${selfEmployeeId} AND tenant_id = ${auth.tenantId!} LIMIT 1
          ` as { department_id: string | null }[];
          callerDeptId = emp[0]?.department_id ?? null;
        }

        if (callerDeptId) {
          rows = await sql`
            SELECT lr.*, e.first_name, e.last_name, e.email as emp_email, d.name as dept_name
            FROM hr_leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE lr.tenant_id = ${auth.tenantId!} 
              AND e.department_id = ${callerDeptId}
              AND lr.deleted_at IS NULL
              AND lr.status = 'approved'
            ORDER BY lr.start_date ASC
          ` as Record<string, any>[];
        } else {
          rows = await sql`
            SELECT lr.*, e.first_name, e.last_name, e.email as emp_email, d.name as dept_name
            FROM hr_leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE lr.tenant_id = ${auth.tenantId!} 
              AND lr.deleted_at IS NULL
              AND lr.status = 'approved'
            ORDER BY lr.start_date ASC
            LIMIT 50
          ` as Record<string, any>[];
        }
      }
      // 2. Reporting Lead & Manager Review View
      else if (view === 'team_requests') {
        if (selfEmployeeId) {
          rows = await sql`
            SELECT lr.*, e.first_name, e.last_name, e.email as emp_email, d.name as dept_name
            FROM hr_leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE lr.tenant_id = ${auth.tenantId!} 
              AND (lr.manager_id = ${selfEmployeeId} OR e.department_id IN (
                SELECT department_id FROM employees WHERE id = ${selfEmployeeId}
              ))
              AND lr.deleted_at IS NULL
            ORDER BY lr.created_at DESC
          ` as Record<string, any>[];
        } else if (isHrAdmin) {
          rows = await sql`
            SELECT lr.*, e.first_name, e.last_name, e.email as emp_email, d.name as dept_name
            FROM hr_leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE lr.tenant_id = ${auth.tenantId!} AND lr.deleted_at IS NULL
            ORDER BY lr.created_at DESC
          ` as Record<string, any>[];
        }
      }
      // 3. Employee own requests or specific employee ID
      else if (employeeId || (!isHrAdmin && selfEmployeeId)) {
        const targetId = employeeId ?? selfEmployeeId;
        if (!isHrAdmin && targetId !== selfEmployeeId) {
          return error('Forbidden — you can only view your own leaves', 403);
        }
        rows = await sql`
          SELECT lr.*, e.first_name, e.last_name, e.email as emp_email, d.name as dept_name
          FROM hr_leave_requests lr
          LEFT JOIN employees e ON lr.employee_id = e.id
          LEFT JOIN departments d ON e.department_id = d.id
          WHERE lr.tenant_id = ${auth.tenantId!} AND lr.employee_id = ${targetId} AND lr.deleted_at IS NULL
          ORDER BY lr.created_at DESC
        ` as Record<string, any>[];
      }
      // 4. HR Admin company-wide view
      else if (isHrAdmin) {
        rows = await sql`
          SELECT lr.*, e.first_name, e.last_name, e.email as emp_email, d.name as dept_name
          FROM hr_leave_requests lr
          LEFT JOIN employees e ON lr.employee_id = e.id
          LEFT JOIN departments d ON e.department_id = d.id
          WHERE lr.tenant_id = ${auth.tenantId!} AND lr.deleted_at IS NULL
          ORDER BY lr.created_at DESC
        ` as Record<string, any>[];
      } else {
        rows = [];
      }

      // Format response with rich fields
      const formatted = rows.map((row) => {
        const empName = row.employee_name || (row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Employee');
        const deptName = row.department_name || row.dept_name || 'General';
        return {
          id: row.id,
          tenantId: row.tenant_id,
          employeeId: row.employee_id,
          employeeName: empName,
          employeeEmail: row.employee_email || row.emp_email || '',
          departmentId: row.department_id,
          departmentName: deptName,
          leaveType: row.leave_type,
          startDate: row.start_date,
          endDate: row.end_date,
          daysCount: Number(row.days_count || 1),
          dayType: row.day_type || 'full',
          reason: row.reason,
          status: row.status,
          managerId: row.manager_id,
          managerName: row.manager_name,
          managerStatus: row.manager_status || (row.status === 'approved' ? 'approved' : 'pending'),
          managerComment: row.manager_comment,
          reviewedByManagerAt: row.reviewed_by_manager_at,
          approvedBy: row.approved_by,
          hrStatus: row.hr_status || (row.status === 'approved' ? 'approved' : 'pending'),
          hrComment: row.hr_comment,
          reviewedByHrAt: row.reviewed_by_hr_at,
          backupEmployeeId: row.backup_employee_id,
          backupEmployeeName: row.backup_employee_name,
          handoverNotes: row.handover_notes,
          contactNumber: row.contact_number,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      return json(formatted);
    }

    if (req.method === 'POST') {
      const body = await parseBody<Record<string, unknown>>(req);
      const employeeId = String(body.employeeId ?? selfEmployeeId ?? '').trim();
      const leaveType = String(body.leaveType ?? '').trim();
      const startDate = String(body.startDate ?? '').trim();
      const endDate = String(body.endDate ?? '').trim();
      const daysCount = Number(body.daysCount ?? 1);
      const dayType = String(body.dayType ?? 'full');
      const reason = body.reason ? String(body.reason) : null;
      const backupEmployeeId = body.backupEmployeeId ? String(body.backupEmployeeId) : null;
      const handoverNotes = body.handoverNotes ? String(body.handoverNotes) : null;
      const contactNumber = body.contactNumber ? String(body.contactNumber) : null;

      if (!employeeId || !leaveType || !startDate || !endDate || daysCount <= 0) {
        return error('Missing required fields for leave request', 400);
      }

      if (!isHrAdmin) {
        if (!selfEmployeeId || employeeId !== selfEmployeeId) {
          return error('Forbidden — you can only create leave for yourself', 403);
        }
      }

      // Resolve employee and reporting manager
      let employeeName = `${auth.firstName} ${auth.lastName}`.trim();
      let employeeEmail = auth.email;
      let departmentId: string | null = null;
      let departmentName: string | null = null;
      let managerId: string | null = null;
      let managerName: string | null = null;
      let backupEmployeeName: string | null = null;

      try {
        const empRows = await sql`
          SELECT e.id, e.first_name, e.last_name, e.email, e.department_id, d.name as dept_name
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.id
          WHERE e.id = ${employeeId} AND e.tenant_id = ${auth.tenantId!}
          LIMIT 1
        ` as Record<string, any>[];

        if (empRows.length > 0) {
          const emp = empRows[0];
          employeeName = `${emp.first_name} ${emp.last_name || ''}`.trim();
          employeeEmail = emp.email;
          departmentId = emp.department_id;
          departmentName = emp.dept_name;
        }

        // Resolve backup colleague name if assigned
        if (backupEmployeeId) {
          const backupRows = await sql`
            SELECT first_name, last_name FROM employees WHERE id = ${backupEmployeeId} LIMIT 1
          ` as Record<string, any>[];
          if (backupRows.length > 0) {
            backupEmployeeName = `${backupRows[0].first_name} ${backupRows[0].last_name || ''}`.trim();
          }
        }

        // Resolve reporting lead/manager (lookup team lead or department head)
        if (departmentId) {
          const leadRows = await sql`
            SELECT id, first_name, last_name, job_title
            FROM employees
            WHERE department_id = ${departmentId} 
              AND tenant_id = ${auth.tenantId!}
              AND (
                lower(job_title) LIKE '%lead%' 
                OR lower(job_title) LIKE '%manager%' 
                OR lower(job_title) LIKE '%director%'
                OR lower(job_title) LIKE '%architect%'
              )
              AND id != ${employeeId}
            LIMIT 1
          ` as Record<string, any>[];
          if (leadRows.length > 0) {
            managerId = leadRows[0].id;
            managerName = `${leadRows[0].first_name} ${leadRows[0].last_name || ''}`.trim();
          }
        }
      } catch {
        /* fallback to auth values */
      }

      const id = crypto.randomUUID();

      let insertedRow: Record<string, any>;
      try {
        const rows = await sql`
          INSERT INTO hr_leave_requests (
            id, tenant_id, employee_id, employee_name, employee_email, department_id, department_name,
            leave_type, start_date, end_date, days_count, day_type, reason, status,
            manager_id, manager_name, manager_status, backup_employee_id, backup_employee_name,
            handover_notes, contact_number
          ) VALUES (
            ${id}, ${auth.tenantId!}, ${employeeId}, ${employeeName}, ${employeeEmail}, ${departmentId}, ${departmentName},
            ${leaveType}, ${startDate}, ${endDate}, ${daysCount}, ${dayType}, ${reason}, 'pending',
            ${managerId}, ${managerName}, 'pending', ${backupEmployeeId}, ${backupEmployeeName},
            ${handoverNotes}, ${contactNumber}
          )
          RETURNING *
        ` as Record<string, any>[];
        insertedRow = rows[0];
      } catch {
        // Fallback for legacy database schema
        const rows = await sql`
          INSERT INTO hr_leave_requests (
            id, tenant_id, employee_id, leave_type, start_date, end_date, days_count, reason, status
          ) VALUES (
            ${id}, ${auth.tenantId!}, ${employeeId}, ${leaveType}, ${startDate}, ${endDate}, ${daysCount}, ${reason}, 'pending'
          )
          RETURNING *
        ` as Record<string, any>[];
        insertedRow = rows[0];
      }

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'leave_request',
        entityId: id,
        entityLabel: `Leave Request (${leaveType})`,
        details: `Created leave request for ${daysCount} days (${startDate} to ${endDate}) with reporting manager ${managerName || 'Assigned Lead'}`,
      });

      return json({
        id: insertedRow.id,
        tenantId: insertedRow.tenant_id,
        employeeId: insertedRow.employee_id,
        employeeName,
        employeeEmail,
        departmentId,
        departmentName,
        leaveType: insertedRow.leave_type,
        startDate: insertedRow.start_date,
        endDate: insertedRow.end_date,
        daysCount: Number(insertedRow.days_count || daysCount),
        dayType,
        reason: insertedRow.reason,
        status: insertedRow.status || 'pending',
        managerId,
        managerName,
        managerStatus: 'pending',
        managerComment: null,
        approvedBy: null,
        hrStatus: 'pending',
        hrComment: null,
        backupEmployeeId,
        backupEmployeeName,
        handoverNotes,
        contactNumber,
        createdAt: insertedRow.created_at || new Date().toISOString(),
      }, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}
