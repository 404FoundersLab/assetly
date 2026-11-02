import { corsPreflight, error, getTenantSql, json, parseBody } from '../_lib/db';
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
        SELECT * FROM notifications
        WHERE tenant_id = ${auth.tenantId!} AND user_id = ${auth.sub}
        ORDER BY created_at DESC
        LIMIT 50
      `) as any[];

      const notifications = rows.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        userId: r.user_id,
        title: r.title,
        message: r.message,
        type: r.type,
        link: r.link,
        isRead: r.is_read,
        createdAt: r.created_at,
      }));

      return json(notifications);
    }

    if (req.method === 'PUT') {
      const body = await parseBody<Record<string, unknown>>(req);
      if (body.all || body.markAll) {
        await sql`
          UPDATE notifications
          SET is_read = true
          WHERE tenant_id = ${auth.tenantId!} AND user_id = ${auth.sub}
        `;
      } else if (body.id) {
        await sql`
          UPDATE notifications
          SET is_read = true
          WHERE id = ${String(body.id)} AND tenant_id = ${auth.tenantId!} AND user_id = ${auth.sub}
        `;
      } else if (Array.isArray(body.ids) && body.ids.length > 0) {
        const idStrings = body.ids.map(String);
        await sql`
          UPDATE notifications
          SET is_read = true
          WHERE id = ANY(${idStrings}::uuid[]) AND tenant_id = ${auth.tenantId!} AND user_id = ${auth.sub}
        `;
      }

      return json({ success: true });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Notifications request failed';
    return error(msg, 500);
  }
}

