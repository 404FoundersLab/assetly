import { corsPreflight, error, getTenantSql, json, parseBody } from '../_lib/db';
import { requireAuth, type AuthUser } from '../_lib/auth';
import { canManageUsers } from '../_lib/roles';

export const config = { runtime: 'edge' };

interface AssignmentBody {
  opportunityId?: unknown;
  assigneeIds?: unknown;
  workStatus?: unknown;
  nextStep?: unknown;
}

interface DbAssignment {
  opportunity_id: string;
  user_id: string;
  work_status: 'not_started' | 'in_progress' | 'done';
  work_started_at: string | null;
  next_step: string;
  first_name: string;
  last_name: string;
  email: string;
}

function mapAssignment(row: DbAssignment) {
  return {
    opportunityId: row.opportunity_id,
    userId: row.user_id,
    workStatus: row.work_status,
    workStartedAt: row.work_started_at,
    nextStep: row.next_step,
    userName: [row.first_name, row.last_name].filter(Boolean).join(' '),
    userEmail: row.email,
  };
}

interface AssignmentInput {
  opportunityId: string;
  assigneeIds: string[];
  workStatus: 'not_started' | 'in_progress' | 'done';
  nextStep: string;
}

const VALID_WORK_STATUSES = new Set(['not_started', 'in_progress', 'done']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseAssignmentInput(body: AssignmentBody): AssignmentInput | Response {
  const opportunityId = typeof body.opportunityId === 'string' ? body.opportunityId.trim() : '';
  const assigneeIds = Array.isArray(body.assigneeIds)
    ? [...new Set(body.assigneeIds.filter((id): id is string => typeof id === 'string'))]
    : [];
  let workStatus = typeof body.workStatus === 'string' ? body.workStatus : 'not_started';
  const nextStep = typeof body.nextStep === 'string' ? body.nextStep.trim().slice(0, 4000) : '';

  if (!opportunityId || opportunityId.length > 120) return error('A valid opportunity ID is required', 400);
  if (assigneeIds.length > 30 || assigneeIds.some((id) => !UUID_PATTERN.test(id))) return error('One or more assignee IDs are invalid', 400);
  if (!VALID_WORK_STATUSES.has(workStatus)) return error('Invalid work status', 400);

  // If unassigning, automatically reset in_progress to not_started
  if (assigneeIds.length === 0 && workStatus === 'in_progress') {
    workStatus = 'not_started';
  }

  return { opportunityId, assigneeIds, workStatus: workStatus as AssignmentInput['workStatus'], nextStep };
}

async function ensureAssignmentsTable(sql: any): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS product_opportunity_assignments (
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      opportunity_id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      work_status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (work_status IN ('not_started', 'in_progress', 'done')),
      work_started_at TIMESTAMPTZ,
      next_step TEXT NOT NULL DEFAULT '',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, opportunity_id, user_id)
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_product_opportunity_assignments_user
      ON product_opportunity_assignments (tenant_id, user_id, updated_at DESC);
  `;
}

async function getAssignments(sql: any, tenantId: string, opportunityId?: string): Promise<Response> {
  const rows = opportunityId
    ? await sql`
        SELECT a.opportunity_id, a.user_id, a.work_status, a.work_started_at, a.next_step,
          u.first_name, u.last_name, u.email
        FROM product_opportunity_assignments a
        JOIN users u ON u.id = a.user_id AND u.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantId} AND a.opportunity_id = ${opportunityId}
        ORDER BY a.user_id
      ` as DbAssignment[]
    : await sql`
        SELECT a.opportunity_id, a.user_id, a.work_status, a.work_started_at, a.next_step,
          u.first_name, u.last_name, u.email
        FROM product_opportunity_assignments a
        JOIN users u ON u.id = a.user_id AND u.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantId}
        ORDER BY a.updated_at DESC, a.opportunity_id, a.user_id
      ` as DbAssignment[];
  return json(rows.map(mapAssignment));
}

async function validateAssigneePermissions(
  sql: any,
  auth: AuthUser,
  input: AssignmentInput,
  existingRows: { user_id: string; work_status: AssignmentInput['workStatus']; next_step: string }[],
): Promise<Response | null> {
  const existingIds = existingRows.map((row) => row.user_id);
  if (!canManageUsers(auth.role)) {
    const addedOtherUsers = input.assigneeIds.some((id) => id !== auth.sub && !existingIds.includes(id));
    const removedOtherUsers = existingIds.some((id) => id !== auth.sub && !input.assigneeIds.includes(id));
    if (addedOtherUsers || removedOtherUsers) return error('Only account managers can change other teammates’ assignments', 403);
    if (input.workStatus !== 'in_progress') return error('Only account managers can change work status', 403);
    if (existingRows.some((row) => row.next_step !== input.nextStep)) return error('Only account managers can change the shared next step', 403);
  }

  if (input.assigneeIds.length === 0) return null;
  const users = await sql`
    SELECT id FROM users WHERE id = ANY(${input.assigneeIds}::uuid[]) AND tenant_id = ${auth.tenantId}
  ` as { id: string }[];
  return users.length === input.assigneeIds.length ? null : error('Assignee must belong to your organization', 403);
}

async function persistAssignments(sql: any, auth: AuthUser, input: AssignmentInput, existingIds: string[]): Promise<void> {
  await Promise.all(existingIds
    .filter((userId) => !input.assigneeIds.includes(userId))
    .map((userId) => sql`
      DELETE FROM product_opportunity_assignments
      WHERE tenant_id = ${auth.tenantId} AND opportunity_id = ${input.opportunityId} AND user_id = ${userId}
    `));

  await Promise.all(input.assigneeIds.map((userId) => sql`
    INSERT INTO product_opportunity_assignments (
      tenant_id, opportunity_id, user_id, work_status, work_started_at, next_step, created_by, updated_by
    ) VALUES (
      ${auth.tenantId}, ${input.opportunityId}, ${userId}, ${input.workStatus},
      CASE WHEN ${input.workStatus} = 'in_progress' THEN NOW() ELSE NULL END,
      ${input.nextStep}, ${auth.sub}, ${auth.sub}
    )
    ON CONFLICT (tenant_id, opportunity_id, user_id) DO UPDATE SET
      work_status = EXCLUDED.work_status,
      work_started_at = CASE
        WHEN EXCLUDED.work_status = 'in_progress' THEN COALESCE(product_opportunity_assignments.work_started_at, NOW())
        WHEN EXCLUDED.work_status = 'not_started' THEN NULL
        ELSE product_opportunity_assignments.work_started_at
      END,
      next_step = EXCLUDED.next_step,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `));
}

async function handlePut(req: Request, sql: any, auth: AuthUser): Promise<Response> {
  const body = await parseBody<AssignmentBody>(req);
  const parsed = parseAssignmentInput(body);
  if (parsed instanceof Response) return parsed;

  const existingRows = await sql`
    SELECT user_id, work_status, next_step FROM product_opportunity_assignments
    WHERE tenant_id = ${auth.tenantId} AND opportunity_id = ${parsed.opportunityId}
  ` as { user_id: string; work_status: AssignmentInput['workStatus']; next_step: string }[];
  const existingIds = existingRows.map((row) => row.user_id);
  const permissionError = await validateAssigneePermissions(sql, auth, parsed, existingRows);
  if (permissionError) return permissionError;

  await persistAssignments(sql, auth, parsed, existingIds);
  return getAssignments(sql, auth.tenantId!, parsed.opportunityId);
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId) return error('Tenant ID is required', 400);
  if (req.method !== 'GET' && req.method !== 'PUT') return error('Method not allowed', 405);

  try {
    const sql = await getTenantSql(auth.tenantId);
    try {
      return req.method === 'GET'
        ? await getAssignments(sql, auth.tenantId)
        : await handlePut(req, sql, auth);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      if (
        msg.includes('product_opportunity_assignments') &&
        (msg.includes('does not exist') || msg.includes('relation'))
      ) {
        await ensureAssignmentsTable(sql);
        return req.method === 'GET'
          ? await getAssignments(sql, auth.tenantId)
          : await handlePut(req, sql, auth);
      }
      throw dbErr;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('product_opportunity_assignments') && message.includes('does not exist')) {
      try {
        const sql = await getTenantSql(auth.tenantId);
        await ensureAssignmentsTable(sql);
        return req.method === 'GET'
          ? await getAssignments(sql, auth.tenantId)
          : await handlePut(req, sql, auth);
      } catch {
        return error('Database migration needed. Run migration 022 for product opportunity assignments.', 500);
      }
    }
    return error(message, 500);
  }
}
