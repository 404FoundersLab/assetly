import { parseValidated, looseBody, text } from '../_lib/validate';
import { getSql, getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapEmployee, type DbEmployee } from '../_lib/mappers';
import { belongsToTenant } from '../_lib/fk';
import { requireAuth, insertAuditLog, hashPassword, generateTempPassword } from '../_lib/auth';
import { checkCircularManager, ensureWorkflowTables } from '../_lib/workflow-engine';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId) return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);
  await ensureWorkflowTables(sql);

  try {
    if (req.method === 'GET') {
      if (auth.role === 'employee') {
        if (!auth.employeeId) return json([]);
        const own = (await sql`
          SELECT e.* FROM employees e WHERE e.tenant_id = ${auth.tenantId!} AND e.id = ${auth.employeeId}
        `) as DbEmployee[];
        return json(own.map(mapEmployee));
      }
      const rows = (await sql`
        SELECT e.*, m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.tenant_id = ${auth.tenantId!}
        ORDER BY e.created_at DESC
      `) as DbEmployee[];
      return json(rows.map(mapEmployee));
    }

    if (req.method === 'POST') {
      const body = await parseValidated(req, looseBody({ firstName:text(100),lastName:text(100),email:text(254) }));
      const firstName = String(body.firstName ?? '').trim();
      const lastName = String(body.lastName ?? '').trim();
      const joiningEmail = String(body.joiningEmail ?? body.email ?? '').trim().toLowerCase();
      if (!firstName || !lastName || !joiningEmail) {
        return error('firstName, lastName, and joiningEmail are required', 400);
      }

      const existingUser = (await getSql()`SELECT tenant_id FROM users WHERE lower(email) = ${joiningEmail} LIMIT 1`) as { tenant_id: string }[];
      if (existingUser.length > 0 && existingUser[0].tenant_id !== auth.tenantId) {
        return error('This email is already registered to another organization', 409);
      }

      const id = body.id && String(body.id) ? String(body.id) : crypto.randomUUID();
      const managerId = body.managerId ? String(body.managerId).trim() : null;

      const deptRef = body.departmentId ? String(body.departmentId) : null;
      if (!(await belongsToTenant(sql, 'departments', deptRef, auth.tenantId!)) || !(await belongsToTenant(sql, 'employees', managerId, auth.tenantId!))) {
        return error('Referenced department or manager was not found', 404);
      }

      if (managerId) {
        const isCycle = await checkCircularManager(sql, auth.tenantId!, id, managerId);
        if (isCycle) {
          return error('Circular reporting relationship detected: an employee cannot report to themselves or someone in their reporting sub-tree', 400);
        }
      }

      let rows: DbEmployee[];
      try {
        rows = (await sql`
          INSERT INTO employees (
            id, tenant_id, employee_number, first_name, last_name, email, joining_email, official_email,
            job_title, department_id, status, hire_date, manager_id
          ) VALUES (
            ${id}, ${auth.tenantId!},
            ${body.employeeNumber ? String(body.employeeNumber) : null},
            ${firstName}, ${lastName}, ${joiningEmail}, ${joiningEmail}, NULL,
            ${body.jobTitle ? String(body.jobTitle) : null},
            ${body.departmentId ? String(body.departmentId) : null},
            ${body.status ? String(body.status) : 'active'},
            ${body.hireDate ? String(body.hireDate) : null},
            ${managerId}
          )
          RETURNING *
        `) as DbEmployee[];
      } catch (insertErr: unknown) {
        const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
        if (errMsg.includes('manager_id') || errMsg.includes('joining_email') || errMsg.includes('column') || (insertErr as { code?: string })?.code === '42703') {
          try {
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id)`;
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_email TEXT`;
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_email TEXT`;

            rows = (await sql`
              INSERT INTO employees (
                id, tenant_id, employee_number, first_name, last_name, email, joining_email, official_email,
                job_title, department_id, status, hire_date, manager_id
              ) VALUES (
                ${id}, ${auth.tenantId!},
                ${body.employeeNumber ? String(body.employeeNumber) : null},
                ${firstName}, ${lastName}, ${joiningEmail}, ${joiningEmail}, NULL,
                ${body.jobTitle ? String(body.jobTitle) : null},
                ${body.departmentId ? String(body.departmentId) : null},
                ${body.status ? String(body.status) : 'active'},
                ${body.hireDate ? String(body.hireDate) : null},
                ${managerId}
              )
              RETURNING *
            `) as DbEmployee[];
          } catch {
            rows = (await sql`
              INSERT INTO employees (
                id, tenant_id, employee_number, first_name, last_name, email,
                job_title, department_id, status, hire_date
              ) VALUES (
                ${id}, ${auth.tenantId!},
                ${body.employeeNumber ? String(body.employeeNumber) : null},
                ${firstName}, ${lastName}, ${joiningEmail},
                ${body.jobTitle ? String(body.jobTitle) : null},
                ${body.departmentId ? String(body.departmentId) : null},
                ${body.status ? String(body.status) : 'active'},
                ${body.hireDate ? String(body.hireDate) : null}
              )
              RETURNING *
            `) as DbEmployee[];
          }
        } else {
          throw insertErr;
        }
      }

      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'employee',
        entityId: id,
        entityLabel: `${firstName} ${lastName}`,
        details: `Created employee with joining email ${joiningEmail}${managerId ? ' and assigned manager' : ''}`,
      });

      let temporaryPassword: string | undefined;
      try {
        const mainSql = getSql();
        const userId = crypto.randomUUID();
        await mainSql`
          INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
          VALUES (${userId}, ${auth.tenantId!}, ${joiningEmail}, ${firstName}, ${lastName}, 'employee')
          ON CONFLICT (email) DO NOTHING
        `;
        const hasPassword = (await mainSql`
          SELECT 1 FROM user_passwords WHERE lower(email) = ${joiningEmail}
        `) as unknown[];
        if (hasPassword.length === 0) {
          temporaryPassword = generateTempPassword();
          const hash = await hashPassword(temporaryPassword);
          await mainSql`
            INSERT INTO user_passwords (email, password_hash, must_change_password)
            VALUES (${joiningEmail}, ${hash}, true)
            ON CONFLICT (email) DO NOTHING
          `;
        }
      } catch {
        temporaryPassword = undefined;
      }
      // If manager name is available, fetch it for mapped return
      if (rows[0] && managerId) {
        try {
          const m = (await sql`SELECT first_name || ' ' || last_name as manager_name FROM employees WHERE id = ${managerId}`) as any[];
          if (m[0]?.manager_name) rows[0].manager_name = m[0].manager_name;
        } catch {}
      }

      return json({ ...mapEmployee(rows[0]), temporaryPassword }, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('unique') || message.includes('duplicate')) {
      return error('Employee email already exists', 409);
    }
    return error(message, 500);
  }
}
