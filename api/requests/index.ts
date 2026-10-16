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

export async function ensureAssetRequestsTable(sql: any): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS asset_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES employees(id),
      request_type VARCHAR(20) NOT NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      needed_by DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'submitted',
      review_notes TEXT,
      reviewed_by VARCHAR(255),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      asset_ids UUID[]
    );
  `;
  try {
    await sql`ALTER TABLE asset_requests ADD COLUMN IF NOT EXISTS asset_ids UUID[];`;
    await sql`ALTER TABLE asset_requests DROP CONSTRAINT IF EXISTS asset_requests_request_type_check;`;
    await sql`
      ALTER TABLE asset_requests ADD CONSTRAINT asset_requests_request_type_check 
      CHECK (request_type IN ('new', 'replacement', 'accessory', 'return'));
    `;
    await sql`ALTER TABLE asset_requests DROP CONSTRAINT IF EXISTS asset_requests_status_check;`;
    await sql`
      ALTER TABLE asset_requests ADD CONSTRAINT asset_requests_status_check 
      CHECK (status IN ('submitted', 'approved', 'rejected', 'fulfilled'));
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_asset_requests_tenant ON asset_requests(tenant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_asset_requests_employee ON asset_requests(tenant_id, employee_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_asset_requests_status ON asset_requests(tenant_id, status);`;
  } catch (err) {
    console.warn('[asset_requests] Warning ensuring table schema:', err);
  }
}

async function fetchRequests(tenantId: string, employeeId?: string): Promise<DbAssetRequest[]> {
  const sql = await getTenantSql(tenantId);

  try {
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
  } catch (err: any) {
    if (String(err?.message || err).includes('asset_requests') && String(err?.message || err).includes('does not exist')) {
      await ensureAssetRequestsTable(sql);
      return [];
    }
    throw err;
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  try {
    if (req.method === 'GET') {
      if (canReviewRequests(auth.role)) {
        const rows = await fetchRequests(auth.tenantId!);
        return json(rows.map(mapAssetRequest));
      }

      if (auth.role === 'employee') {
        const employeeId = await resolveEmployeeId(auth);
        if (employeeId instanceof Response) return employeeId;
        const rows = await fetchRequests(auth.tenantId!, employeeId);
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
      let rows: DbAssetRequest[] = [];
      try {
        rows = (await sql`
          INSERT INTO asset_requests (
            tenant_id, employee_id, request_type, category, description, needed_by, asset_ids
          ) VALUES (
            ${auth.tenantId!}, ${employeeId}, ${requestType}, ${category}, ${description}, ${neededBy}, ${assetIds}
          )
          RETURNING *
        `) as DbAssetRequest[];
      } catch (insertErr: any) {
        const msg = String(insertErr?.message || insertErr);
        if (msg.includes('asset_requests') && (msg.includes('does not exist') || msg.includes('column') || msg.includes('constraint'))) {
          await ensureAssetRequestsTable(sql);
          rows = (await sql`
            INSERT INTO asset_requests (
              tenant_id, employee_id, request_type, category, description, needed_by, asset_ids
            ) VALUES (
              ${auth.tenantId!}, ${employeeId}, ${requestType}, ${category}, ${description}, ${neededBy}, ${assetIds}
            )
            RETURNING *
          `) as DbAssetRequest[];
        } else {
          throw insertErr;
        }
      }

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
    return error(message, 500);
  }
}
