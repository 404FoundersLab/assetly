import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import {
  mapAsset,
  mapAssignment,
  mapOwnershipEvent,
  assetInsertPayload,
  type DbAsset,
  type DbAssignment,
  type DbOwnershipEvent,
} from '../_lib/mappers';
import { requireAuth } from '../_lib/auth';
import { checkAssetLimit } from '../_lib/subscription';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId! && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  const sql = await getTenantSql(auth.tenantId!);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM assets
        WHERE tenant_id = ${auth.tenantId!}
        ORDER BY created_at DESC
      ` as DbAsset[];

      const assignments = await sql`
        SELECT * FROM asset_assignments
        WHERE tenant_id = ${auth.tenantId!}
        ORDER BY assigned_at DESC
      ` as DbAssignment[];

      const history = await sql`
        SELECT * FROM ownership_history
        WHERE tenant_id = ${auth.tenantId!}
        ORDER BY created_at DESC
      ` as DbOwnershipEvent[];

      return json({
        data: rows.map(mapAsset),
        assignments: assignments.map(mapAssignment),
        ownershipHistory: history.map(mapOwnershipEvent),
      });
    }

    if (req.method === 'POST') {
      const tenantId = auth.tenantId!;
      const limitCheck = await checkAssetLimit(tenantId);
      if (!limitCheck.allowed) return error(limitCheck.message ?? 'Plan limit reached', 402);

      const body = await parseBody<Record<string, unknown>>(req);
      const payload = assetInsertPayload(body, (auth.tenantId!));

      const rows = await sql`
        INSERT INTO assets (
          id, tenant_id, asset_tag, name, category, manufacturer, model, serial_number,
          status, lifecycle_stage, purchase_date, purchase_cost, current_value, repair_cost, location,
          department, specs, image_url, vendor_id, assigned_employee_id, warranty_expires_at,
          notes, qr_code_data
        ) VALUES (
          ${payload.id}, ${payload.tenantId}, ${payload.assetTag}, ${payload.name},
          ${payload.category}, ${payload.manufacturer}, ${payload.model}, ${payload.serialNumber},
          ${payload.status}, ${payload.lifecycleStage}, ${payload.purchaseDate},
          ${payload.purchaseCost}, ${payload.currentValue}, ${payload.repairCost}, ${payload.location},
          ${payload.department}, ${payload.specs}, ${payload.imageUrl}, ${payload.vendorId},
          ${payload.assignedEmployeeId}, ${payload.warrantyExpiresAt}, ${payload.notes},
          ${payload.qrCodeData}
        )
        RETURNING *
      ` as DbAsset[];

      const asset = mapAsset(rows[0]);

      if (payload.assignedEmployeeId && body.assignedBy) {
        await sql`
          INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
          VALUES (
            ${auth.tenantId!}, ${asset.id}, ${payload.assignedEmployeeId},
            ${String(body.assignedBy)}, ${body.assignmentNotes ? String(body.assignmentNotes) : 'Assigned on create'}
          )
        `;
        await sql`
          INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
          VALUES (
            ${auth.tenantId!}, ${asset.id}, 'ASSIGNED', 'Asset assigned to employee',
            ${String(body.assignedBy)}
          )
        `;
      }

      if (body.audit && typeof body.audit === 'object') {
        const audit = body.audit as Record<string, string>;
        await sql`
          INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id, entity_label, details)
          VALUES (
            ${auth.tenantId!}, ${audit.userId ?? null}, ${audit.userName ?? null},
            ${audit.action ?? 'CREATE'}, ${audit.entityType ?? 'asset'}, ${audit.entityId ?? asset.id},
            ${audit.entityLabel ?? asset.assetTag}, ${audit.details ?? null}
          )
        `;
      }

      return json(asset, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('unique') || message.includes('duplicate')) {
      return error('Asset tag already exists', 409);
    }
    return error(message, 500);
  }
}
