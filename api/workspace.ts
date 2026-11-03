import { getTenantSql, json, error, corsPreflight } from './_lib/db';
import { validateBody, z } from './_lib/validate';
import { requireAuth } from './_lib/auth';

export const config = { runtime: 'edge' };

const KINDS = ['projects', 'tasks', 'todos', 'employee_docs'] as const;
type Kind = (typeof KINDS)[number];

const READ_ONLY_ROLES = new Set(['viewer', 'employee']);
const DOC_ROLES = new Set(['tenant_admin', 'hr_admin', 'it_admin']);
const MAX_ITEMS_PER_REQUEST = 500;
const MAX_ITEM_CHARS = 200_000;

const ensured = new Set<string>();

async function ensureTable(sql: any, tenantId: string) {
  if (ensured.has(tenantId)) return;
  await sql`
    CREATE TABLE IF NOT EXISTS workspace_items (
      tenant_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, kind, id)
    )
  `;
  ensured.add(tenantId);
}

function parseKind(value: unknown): Kind | null {
  return KINDS.includes(value as Kind) ? (value as Kind) : null;
}

/** Tenant-scoped store for projects, tasks, todos and employee documents. */
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId) return error('Tenant ID is required', 400);
  const tenantId = auth.tenantId;

  try {
    const sql = await getTenantSql(tenantId);
    await ensureTable(sql, tenantId);

    if (req.method === 'GET') {
      const kind = parseKind(new URL(req.url).searchParams.get('kind'));
      if (!kind) return error('Invalid kind', 400);
      if (kind === 'employee_docs' && !DOC_ROLES.has(auth.role)) return error('Forbidden', 403);
      const rows = (await sql`
        SELECT id, data FROM workspace_items
        WHERE tenant_id = ${tenantId} AND kind = ${kind}
        ORDER BY updated_at DESC
        LIMIT 5000
      `) as { id: string; data: unknown }[];
      return json({ items: rows.map((r) => r.data) });
    }

    if (req.method !== 'POST') return error('Method not allowed', 405);
    if (READ_ONLY_ROLES.has(auth.role)) return error('Forbidden: read-only role', 403);

    const parsed = await validateBody(
      req,
      z.object({
        kind: z.string().max(32),
        upserts: z.array(z.object({ id: z.string().min(1).max(128), data: z.unknown() })).max(500).optional(),
        deletes: z.array(z.string().max(128)).max(500).optional(),
      }),
      5_000_000,
    );
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const kind = parseKind(body.kind);
    if (!kind) return error('Invalid kind', 400);
    if (kind === 'employee_docs' && !DOC_ROLES.has(auth.role)) return error('Forbidden', 403);

    const upserts = Array.isArray(body.upserts) ? body.upserts : [];
    const deletes = Array.isArray(body.deletes) ? body.deletes.map(String) : [];
    if (upserts.length + deletes.length > MAX_ITEMS_PER_REQUEST) return error('Too many items in one request', 413);

    for (const u of upserts) {
      const id = String(u.id ?? '');
      if (!id || id.length > 128 || typeof u.data !== 'object' || u.data === null) {
        return error('Invalid item', 400);
      }
      const payload = JSON.stringify(u.data);
      if (payload.length > MAX_ITEM_CHARS) return error('Item too large', 413);
      await sql`
        INSERT INTO workspace_items (tenant_id, kind, id, data, updated_by, updated_at)
        VALUES (${tenantId}, ${kind}, ${id}, ${payload}::jsonb, ${auth.sub}, NOW())
        ON CONFLICT (tenant_id, kind, id)
        DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `;
    }
    for (const id of deletes) {
      await sql`DELETE FROM workspace_items WHERE tenant_id = ${tenantId} AND kind = ${kind} AND id = ${id}`;
    }
    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Workspace request failed', 500);
  }
}
