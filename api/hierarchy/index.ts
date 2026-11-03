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

      const employees = rows.map((r) => {
        const firstName = r.first_name ?? '';
        const lastName = r.last_name ?? '';
        const name = `${firstName} ${lastName}`.trim() || r.email || 'Employee';
        return {
          id: r.id,
          employeeNumber: r.employee_number ?? '',
          name,
          firstName,
          lastName,
          fullName: name,
          email: r.email ?? '',
          jobTitle: r.job_title ?? 'Employee',
          departmentId: r.department_id ?? '',
          departmentName: r.department_name ?? 'General',
          status: r.status ?? 'active',
          managerId: r.manager_id ?? undefined,
          managerName: r.manager_name ? String(r.manager_name).trim() : undefined,
          directReportsCount: Number(r.direct_reports_count || 0),
        };
      });

      // Build hierarchical tree
      const nodeMap = new Map<string, any>();
      for (const emp of employees) {
        nodeMap.set(emp.id, {
          ...emp,
          children: [],
        });
      }

      const tree: any[] = [];
      for (const emp of employees) {
        const node = nodeMap.get(emp.id)!;
        if (emp.managerId && nodeMap.has(emp.managerId) && emp.managerId !== emp.id) {
          nodeMap.get(emp.managerId)!.children.push(node);
        } else {
          tree.push(node);
        }
      }

      const managers = employees.filter((e) => e.directReportsCount > 0);

      return json({
        totalEmployees: employees.length,
        managersCount: managers.length,
        tree,
        flat: Array.from(nodeMap.values()),
        employees,
        managers,
        topLevel: tree,
        totalCount: employees.length,
      });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Hierarchy request failed';
    return error(msg, 500);
  }
}

