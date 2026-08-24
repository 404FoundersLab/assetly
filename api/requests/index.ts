import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { mapAssetRequest, type DbAssetRequest } from '../_lib/mappers';
import { requireAuth, canReviewRequests, insertAuditLog, type AuthUser } from '../_lib/auth';
import { resolveEmployeeIdByLoginEmail } from '../_lib/employee-auth';

export const config = { runtime: 'edge' };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveEmployeeId(auth: AuthUser): Promise<string | Response> {
  const sql = await getTenantSql(auth.tenantId!);

  if (auth.employeeId && isUuid(auth.employeeId)) {
    return auth.employeeId;
  }

  try {
    const employeeId = await resolveEmployeeIdByLoginEmail(sql, auth.tenantId!, auth.email);
    if (employeeId) return employeeId;
  } catch {
    return error('Employee record not found for this account', 403);
  }

  return error('Employee record not found for this account', 403);
}

async function fetchRequests(tenantId: string, employeeId?: string): Promise<DbAssetRequest[]> {
  const sql = await getTenantSql(tenantId);

  if (employeeId) {
    return (await sql`
      SELECT
        r.*,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        d.name AS department_name
      FROM asset_requests r
      JOIN employees e ON e.id = r.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE r.tenant_id = ${tenantId} AND r.employee_id = ${employeeId}
      ORDER BY r.created_at DESC
    `) as DbAssetRequest[];
  }

  return (await sql`
    SELECT
      r.*,
      e.first_name AS employee_first_name,
      e.last_name AS employee_last_name,
      e.email AS employee_email,
      d.name AS department_name
    FROM asset_requests r
    JOIN employees e ON e.id = r.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE r.tenant_id = ${tenantId}
    ORDER BY r.created_at DESC
  `) as DbAssetRequest[];
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  try {
    if (req.method === 'GET') {
      if (canReviewRequests(auth.role)) {
        const rows = await fetchRequests(auth.tenantId!);
        return json(rows.map(mapAssetRequest));
      }

      if (auth.role === 'employee') {
        const employeeId = await resolveEmployeeId(auth);
        if (employeeId instanceof Response) return employeeId;
        const rows = await fetchRequests(auth.tenantId || employeeId);
        return json(rows.map(mapAssetRequest));
      }

      return error('Forbidden', 403);
    }

    if (req.method === 'POST') {
      if (auth.role !== 'employee') {
        return error('Only employees can submit device requests', 403);
      }

      const employeeId = await resolveEmployeeId(auth);
        if (employeeId instanceof Response) return employeeId;

        const body = await parseBody<Record<string, unknown>>(req);
      const requestType = String(body.requestType ?? '').trim();
      const category = String(body.category ?? '').trim();
      const description = String(body.description ?? '').trim();
      const neededBy = body.neededBy ? String(body.neededBy) : null;

      if (!requestType || !category || !description) {
        return error('requestType, category, and description are required', 400);
      }

      if (!['new', 'replacement', 'accessory', 'return'].includes(requestType)) {
        return error('Invalid requestType', 400);
      }

      const assetIds = Array.isArray(body.assetIds) ? body.assetIds : null;

      const sql = await getTenantSql(auth.tenantId!);
      const rows = (await sql`
        INSERT INTO asset_requests (
          tenant_id, employee_id, request_type, category, description, needed_by, asset_ids
        ) VALUES (
          ${auth.tenantId!}, ${employeeId}, ${requestType}, ${category}, ${description}, ${neededBy}, ${assetIds}
        )
        RETURNING *
      `) as DbAssetRequest[];

      const created = rows[0];

      try {
        await insertAuditLog({
          userId: auth.sub,
          userName: `${auth.firstName} ${auth.lastName}`,
          action: 'CREATE',
          entityType: 'asset_request',
          entityId: created.id,
          entityLabel: `${requestType} — ${category}`,
          details: description.slice(0, 200),
        });
      } catch {
        /* non-blocking */
      }

      return json(mapAssetRequest(created), 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('asset_requests') && message.includes('does not exist')) {
      return error('Database migration needed. Run database/supabase/004_asset_requests.sql', 500);
    }
    return error(message, 500);
  }
}
