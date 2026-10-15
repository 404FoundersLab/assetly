import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST' && req.method !== 'DELETE') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  try {
    const body = await parseBody<{ ids?: string[] }>(req);
    const rawIds = Array.isArray(body?.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (rawIds.length === 0) return error('No asset IDs provided', 400);

    const sql = await getTenantSql(auth.tenantId!);

    // Separate valid UUIDs and tags
    const targetUuids = rawIds.filter(isUuid);
    const nonUuids = rawIds.filter((id) => !isUuid(id));

    if (nonUuids.length > 0) {
      const tagMatches = (await sql`
        SELECT id FROM assets
        WHERE tenant_id = ${auth.tenantId!} AND asset_tag = ANY(${nonUuids}::varchar[])
      `) as { id: string }[];
      tagMatches.forEach((row) => {
        if (!targetUuids.includes(row.id)) targetUuids.push(row.id);
      });
    }

    if (targetUuids.length === 0) {
      return error('No matching assets found to delete', 404);
    }

    // Clean up ownership history & assignments
    await sql`
      DELETE FROM ownership_history
      WHERE tenant_id = ${auth.tenantId!} AND asset_id = ANY(${targetUuids}::uuid[])
    `;
    await sql`
      DELETE FROM asset_assignments
      WHERE tenant_id = ${auth.tenantId!} AND asset_id = ANY(${targetUuids}::uuid[])
    `;

    // Delete the assets
    const deleted = (await sql`
      DELETE FROM assets
      WHERE tenant_id = ${auth.tenantId!} AND id = ANY(${targetUuids}::uuid[])
      RETURNING id, asset_tag
    `) as { id: string; asset_tag: string }[];

    const tagSummary = deleted
      .slice(0, 10)
      .map((d) => d.asset_tag)
      .join(', ');
    const extraCount = deleted.length > 10 ? ` and ${deleted.length - 10} more` : '';

    await insertAuditLog({
      userId: auth.sub,
      userName: `${auth.firstName} ${auth.lastName}`,
      action: 'DELETE',
      entityType: 'asset',
      entityId: 'bulk-delete',
      entityLabel: `${deleted.length} assets`,
      details: `Bulk deleted ${deleted.length} asset(s): ${tagSummary}${extraCount}`,
    });

    return json({ success: true, count: deleted.length, deleted });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Bulk delete failed', 500);
  }
}
