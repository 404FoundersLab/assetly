import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapEmployee, type DbEmployee } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import {
  activeEmployeeLoginEmail,
  migrateEmployeeLoginEmail,
} from '../_lib/employee-auth';

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
        SELECT * FROM employees WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
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

      const rows = await sql`
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
          hire_date = COALESCE(${body.hireDate != null ? String(body.hireDate) : null}, hire_date)
        WHERE id = ${id} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbEmployee[];

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
