import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapEmployee, type DbEmployee } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import { checkCircularManager, ensureWorkflowTables } from '../_lib/workflow-engine';

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
      const body = await parseBody<Record<string, unknown>>(req);
      const firstName = String(body.firstName ?? '').trim();
      const lastName = String(body.lastName ?? '').trim();
      const joiningEmail = String(body.joiningEmail ?? body.email ?? '').trim().toLowerCase();
      if (!firstName || !lastName || !joiningEmail) {
        return error('firstName, lastName, and joiningEmail are required', 400);
      }

      const id = body.id && String(body.id) ? String(body.id) : crypto.randomUUID();
      const managerId = body.managerId ? String(body.managerId).trim() : null;

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
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'CREATE',
        entityType: 'employee',
        entityId: id,
        entityLabel: `${firstName} ${lastName}`,
        details: `Created employee with joining email ${joiningEmail}${managerId ? ' and assigned manager' : ''}`,
      });

      const userId = crypto.randomUUID();
      try {
        await sql`
          INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
          VALUES (${userId}, ${auth.tenantId!}, ${joiningEmail}, ${firstName}, ${lastName}, 'employee')
          ON CONFLICT (email) DO NOTHING
        `;
      } catch {
        try {
          await sql`
            INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
            VALUES (${userId}, ${auth.tenantId!}, ${joiningEmail}, ${firstName}, ${lastName}, 'employee')
            ON CONFLICT (tenant_id, email) DO NOTHING
          `;
        } catch {
          /* user may already exist */
        }
      }

      try {
        await sql`
          INSERT INTO user_passwords (email, password_hash, must_change_password)
          VALUES (${joiningEmail}, 'optional-on-first-login', true)
          ON CONFLICT (email) DO UPDATE SET password_hash = 'optional-on-first-login', must_change_password = true
        `;
      } catch {
        /* user_passwords table might not have email constraint or already updated */
      }

      // If manager name is available, fetch it for mapped return
      if (rows[0] && managerId) {
        try {
          const m = (await sql`SELECT first_name || ' ' || last_name as manager_name FROM employees WHERE id = ${managerId}`) as any[];
          if (m[0]?.manager_name) rows[0].manager_name = m[0].manager_name;
        } catch {}
      }

      return json(mapEmployee(rows[0]), 201);
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
