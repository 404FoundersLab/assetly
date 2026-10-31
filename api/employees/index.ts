import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapEmployee, type DbEmployee } from '../_lib/mappers';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM employees WHERE tenant_id = ${auth.tenantId!} ORDER BY created_at DESC
      ` as DbEmployee[];
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
      let rows: DbEmployee[];
      try {
        rows = await sql`
        INSERT INTO employees (
          id, tenant_id, employee_number, first_name, last_name, email, joining_email, official_email,
          job_title, department_id, status, hire_date
        ) VALUES (
          ${id}, ${auth.tenantId!},
          ${body.employeeNumber ? String(body.employeeNumber) : null},
          ${firstName}, ${lastName}, ${joiningEmail}, ${joiningEmail}, NULL,
          ${body.jobTitle ? String(body.jobTitle) : null},
          ${body.departmentId ? String(body.departmentId) : null},
          ${body.status ? String(body.status) : 'active'},
          ${body.hireDate ? String(body.hireDate) : null}
        )
        RETURNING *
      ` as DbEmployee[];
      } catch (insertErr: unknown) {
        const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
        if (errMsg.includes('joining_email') || errMsg.includes('column') || (insertErr as { code?: string })?.code === '42703') {
          try {
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_email TEXT`;
            await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS official_email TEXT`;
            await sql`UPDATE employees SET joining_email = email WHERE joining_email IS NULL`;

            rows = await sql`
        INSERT INTO employees (
          id, tenant_id, employee_number, first_name, last_name, email, joining_email, official_email,
          job_title, department_id, status, hire_date
        ) VALUES (
          ${id}, ${auth.tenantId!},
          ${body.employeeNumber ? String(body.employeeNumber) : null},
          ${firstName}, ${lastName}, ${joiningEmail}, ${joiningEmail}, NULL,
          ${body.jobTitle ? String(body.jobTitle) : null},
          ${body.departmentId ? String(body.departmentId) : null},
          ${body.status ? String(body.status) : 'active'},
          ${body.hireDate ? String(body.hireDate) : null}
        )
        RETURNING *
      ` as DbEmployee[];
          } catch {
            rows = await sql`
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
            ` as DbEmployee[];
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
        details: `Created employee with joining email ${joiningEmail}`,
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
