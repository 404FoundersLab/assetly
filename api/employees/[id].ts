import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapEmployee, type DbEmployee } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import {
  activeEmployeeLoginEmail,
  migrateEmployeeLoginEmail,
} from '../_lib/employee-auth';
import { checkCircularManager, ensureWorkflowTables } from '../_lib/workflow-engine';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const url = new URL(req.url);
  const id = url.pathname.split('/').filter(Boolean).pop();
  if (!id || id === 'employees') return error('Employee id required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT e.*, m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.id = ${id} AND e.tenant_id = ${auth.tenantId!}
      ` as DbEmployee[];
      if (rows.length === 0) return error('Employee not found', 404);
      return json(mapEmployee(rows[0]));
    }

    if (req.method === 'PATCH') {
      const body = await parseBody<Record<string, unknown>>(req);

      const currentRows = await sql`
        SELECT * FROM employees WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
      ` as DbEmployee[];
      if (currentRows.length === 0) return error('Employee not found', 404);

      const current = currentRows[0];
      const previousLoginEmail = activeEmployeeLoginEmail(current);

      const firstName = body.firstName ? String(body.firstName).trim() : current.first_name;
      const lastName =
        body.lastName !== undefined ? String(body.lastName).trim() : (current.last_name ?? '');

      const managerId = body.managerId !== undefined
        ? (body.managerId ? String(body.managerId).trim() : null)
        : current.manager_id;

      if (body.managerId !== undefined && managerId) {
        if (managerId === id) {
          return error('An employee cannot be their own manager', 400);
        }
        const isCycle = await checkCircularManager(sql, auth.tenantId!, id, managerId);
        if (isCycle) {
          return error('Circular reporting relationship detected: an employee cannot report to someone in their reporting sub-tree', 400);
        }
      }

      let officialEmail = current.official_email?.trim().toLowerCase() ?? null;
      if (body.officialEmail !== undefined) {
        const raw = String(body.officialEmail ?? '').trim().toLowerCase();
        officialEmail = raw || null;
      }

      const joiningEmail = (current.joining_email ?? current.email ?? '').trim().toLowerCase();
      const nextLoginEmail = officialEmail ?? joiningEmail;

      if (officialEmail && nextLoginEmail !== previousLoginEmail) {
        const migration = await migrateEmployeeLoginEmail(
          sql,
          auth.tenantId!,
          previousLoginEmail,
          nextLoginEmail,
          firstName,
          lastName,
        );
        if (!migration.ok) return error(migration.message, 409);
      } else if (
        !officialEmail &&
        (body.firstName || body.lastName !== undefined) &&
        previousLoginEmail
      ) {
        await sql`
          UPDATE users
          SET first_name = ${firstName}, last_name = ${lastName}
          WHERE tenant_id = ${auth.tenantId!} AND role = 'employee' AND lower(email) = ${previousLoginEmail}
        `;
      }

      let rows: DbEmployee[];
      try {
        rows = await sql`
        UPDATE employees SET
          employee_number = COALESCE(${body.employeeNumber != null ? String(body.employeeNumber) : null}, employee_number),
          first_name = ${firstName},
          last_name = ${lastName},
          joining_email = ${joiningEmail},
          official_email = ${officialEmail},
          email = ${nextLoginEmail},
          job_title = COALESCE(${body.jobTitle != null ? String(body.jobTitle) : null}, job_title),
          department_id = COALESCE(${
            body.departmentId !== undefined
              ? body.departmentId
                ? String(body.departmentId)
                : null
              : null
          }, department_id),
          status = COALESCE(${body.status ? String(body.status) : null}, status),
          hire_date = COALESCE(${body.hireDate != null ? String(body.hireDate) : null}, hire_date),
          manager_id = ${managerId}
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbEmployee[];
      } catch (updateErr: unknown) {
        const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
        if (errMsg.includes('joining_email') || errMsg.includes('manager_id') || errMsg.includes('column') || (updateErr as { code?: string })?.code === '42703') {
          try {
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id)`;
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_email TEXT`;
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_email TEXT`;
            await sql`UPDATE employees SET joining_email = email WHERE joining_email IS NULL`;

            rows = await sql`
        UPDATE employees SET
          employee_number = COALESCE(${body.employeeNumber != null ? String(body.employeeNumber) : null}, employee_number),
          first_name = ${firstName},
          last_name = ${lastName},
          joining_email = ${joiningEmail},
          official_email = ${officialEmail},
          email = ${nextLoginEmail},
          job_title = COALESCE(${body.jobTitle != null ? String(body.jobTitle) : null}, job_title),
          department_id = COALESCE(${
            body.departmentId !== undefined
              ? body.departmentId
                ? String(body.departmentId)
                : null
              : null
          }, department_id),
          status = COALESCE(${body.status ? String(body.status) : null}, status),
          hire_date = COALESCE(${body.hireDate != null ? String(body.hireDate) : null}, hire_date),
          manager_id = ${managerId}
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbEmployee[];
          } catch {
            rows = await sql`
              UPDATE employees SET
                employee_number = COALESCE(${body.employeeNumber != null ? String(body.employeeNumber) : null}, employee_number),
                first_name = ${firstName},
                last_name = ${lastName},
                email = ${nextLoginEmail},
                job_title = COALESCE(${body.jobTitle != null ? String(body.jobTitle) : null}, job_title),
                department_id = COALESCE(${
                  body.departmentId !== undefined
                    ? body.departmentId
                      ? String(body.departmentId)
                      : null
                    : null
                }, department_id),
                status = COALESCE(${body.status ? String(body.status) : null}, status),
                hire_date = COALESCE(${body.hireDate != null ? String(body.hireDate) : null}, hire_date),
                manager_id = ${managerId}
              WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
              RETURNING *
            ` as DbEmployee[];
          }
        } else {
          throw updateErr;
        }
      }

      const emp = mapEmployee(rows[0]);
      const emailNote =
        officialEmail && officialEmail !== previousLoginEmail
          ? `Official email set to ${officialEmail}; previous sign-in email disabled`
          : 'Employee updated';

      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'employee',
        entityId: id,
        entityLabel: `${emp.firstName} ${emp.lastName}`,
        details: emailNote,
      });
      return json(emp);
    }

    if (req.method === 'DELETE') {
      const empRows = await sql`
        SELECT email, joining_email, official_email
        FROM employees
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
      ` as { email?: string; joining_email?: string; official_email?: string }[];

      if (empRows.length > 0) {
        const emp = empRows[0];
        const emails = [emp.email, emp.joining_email, emp.official_email]
          .filter(Boolean)
          .map((e) => e!.trim().toLowerCase());
        if (emails.length > 0) {
          try {
            await sql`
              DELETE FROM users
              WHERE tenant_id = ${auth.tenantId!}
                AND role = 'employee'
                AND LOWER(email) = ANY(${emails}::text[])
            `;
          } catch {}
          try {
            await sql`
              DELETE FROM user_passwords
              WHERE LOWER(email) = ANY(${emails}::text[])
            `;
          } catch {}
        }
      }

      await sql`DELETE FROM employees WHERE id = ${id} AND tenant_id = ${auth.tenantId!}`;
      await insertAuditLog({
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'DELETE',
        entityType: 'employee',
        entityId: id,
        entityLabel: id,
        details: 'Employee deleted',
      });
      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Request failed', 500);
  }
}
