import { getTenantSql, json, error, corsPreflight } from './_lib/db';
import {
  mapAsset,
  mapEmployee,
  mapDepartment,
  mapVendor,
  mapAssignment,
  mapOwnershipEvent,
  mapAuditLog,
  type DbAsset,
  type DbEmployee,
  type DbDepartment,
  type DbVendor,
  type DbAssignment,
  type DbOwnershipEvent,
  type DbAuditLog,
} from './_lib/mappers';
import { requireAuth } from './_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  try {
    const sql = await getTenantSql(auth.tenantId!);

    let employeeId: string | null = null;
    if (auth.role === 'employee') {
      employeeId = auth.employeeId ?? null;
      if (!employeeId) {
        const resolveEmp = await sql`
          SELECT id FROM employees
          WHERE tenant_id = ${auth.tenantId!}
            AND (
              lower(COALESCE(official_email, joining_email, email)) = ${auth.email.toLowerCase()}
              OR lower(email) = ${auth.email.toLowerCase()}
            )
          LIMIT 1
        ` as { id: string }[];
        employeeId = resolveEmp[0]?.id ?? null;
      }
    }

    const assetsQuery = (auth.role === 'employee' && employeeId)
      ? sql`SELECT * FROM assets WHERE tenant_id = ${auth.tenantId!} AND assigned_employee_id = ${employeeId} ORDER BY created_at DESC`
      : sql`SELECT * FROM assets WHERE tenant_id = ${auth.tenantId!} ORDER BY created_at DESC`;

    const employeesQuery = (auth.role === 'employee' && employeeId)
      ? sql`SELECT * FROM employees WHERE tenant_id = ${auth.tenantId!} AND id = ${employeeId}`
      : sql`SELECT * FROM employees WHERE tenant_id = ${auth.tenantId!} ORDER BY created_at DESC`;

    const departmentsQuery = sql`SELECT * FROM departments WHERE tenant_id = ${auth.tenantId!} ORDER BY name ASC`;

    const vendorsQuery = (auth.role === 'employee')
      ? sql`SELECT * FROM vendors WHERE FALSE`
      : sql`SELECT * FROM vendors WHERE tenant_id = ${auth.tenantId!} ORDER BY name ASC`;

    const assignmentsQuery = (auth.role === 'employee' && employeeId)
      ? sql`SELECT * FROM asset_assignments WHERE tenant_id = ${auth.tenantId!} AND employee_id = ${employeeId} ORDER BY assigned_at DESC`
      : sql`SELECT * FROM asset_assignments WHERE tenant_id = ${auth.tenantId!} ORDER BY assigned_at DESC`;

    const ownershipHistoryQuery = (auth.role === 'employee' && employeeId)
      ? sql`SELECT * FROM ownership_history WHERE tenant_id = ${auth.tenantId!} AND asset_id IN (SELECT id FROM assets WHERE assigned_employee_id = ${employeeId}) ORDER BY created_at DESC`
      : sql`SELECT * FROM ownership_history WHERE tenant_id = ${auth.tenantId!} ORDER BY created_at DESC`;

    const auditLogsQuery = (auth.role === 'employee')
      ? sql`SELECT * FROM audit_logs WHERE FALSE`
      : sql`SELECT * FROM audit_logs WHERE tenant_id = ${auth.tenantId!} ORDER BY created_at DESC LIMIT 200`;

    const [assets, employees, departments, vendors, assignments, ownershipHistory, auditLogs] =
      (await Promise.all([
        assetsQuery,
        employeesQuery,
        departmentsQuery,
        vendorsQuery,
        assignmentsQuery,
        ownershipHistoryQuery,
        auditLogsQuery,
      ])) as [
        DbAsset[],
        DbEmployee[],
        DbDepartment[],
        DbVendor[],
        DbAssignment[],
        DbOwnershipEvent[],
        DbAuditLog[],
      ];

    return json({
      assets: assets.map(mapAsset),
      employees: employees.map(mapEmployee),
      departments: departments.map(mapDepartment),
      vendors: vendors.map(mapVendor),
      assignments: assignments.map(mapAssignment),
      ownershipHistory: ownershipHistory.map(mapOwnershipEvent),
      auditLogs: auditLogs.map(mapAuditLog),
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Sync failed', 500);
  }
}
