import { corsPreflight, error, getTenantSql, json } from '../_lib/db';
import { requireAuth } from '../_lib/auth';
import { ensureWorkflowTables } from '../_lib/workflow-engine';

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
        SELECT
          e.id,
          e.employee_number,
          e.first_name,
          e.last_name,
          e.email,
          e.job_title,
          e.department_id,
          e.status,
          e.manager_id,
          d.name as department_name,
          m.first_name || ' ' || m.last_name as manager_name,
          (SELECT COUNT(*)::int FROM employees r WHERE r.manager_id = e.id AND r.tenant_id = ${auth.tenantId!}) as direct_reports_count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.tenant_id = ${auth.tenantId!}
        ORDER BY d.name ASC NULLS LAST, e.first_name ASC
      `) as any[];

      const employees = rows.map((r) => ({
        id: r.id,
        employeeNumber: r.employee_number ?? '',
        firstName: r.first_name,
        lastName: r.last_name,
        fullName: `${r.first_name} ${r.last_name || ''}`.trim(),
        email: r.email,
        jobTitle: r.job_title ?? 'Employee',
        departmentId: r.department_id ?? '',
        departmentName: r.department_name ?? 'General',
        status: r.status,
        managerId: r.manager_id ?? undefined,
        managerName: r.manager_name ? String(r.manager_name).trim() : undefined,
        directReportsCount: Number(r.direct_reports_count || 0),
      }));

      // Group into hierarchy structure
      const managers = employees.filter((e) => e.directReportsCount > 0);
      const topLevel = employees.filter((e) => !e.managerId);

      return json({
        employees,
        managers,
        topLevel,
        totalCount: employees.length,
      });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Hierarchy request failed';
    return error(msg, 500);
  }
}

