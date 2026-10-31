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
import { requireAuth, insertAuditLog } from '../_lib/auth';
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

      // Sanitize foreign keys to prevent foreign key constraint violations if related entities were removed
      if (payload.vendorId) {
        try {
          const [v] = await sql`SELECT id FROM vendors WHERE id = ${payload.vendorId} AND tenant_id = ${auth.tenantId!} LIMIT 1` as { id: string }[];
          if (!v) payload.vendorId = null;
        } catch {
          payload.vendorId = null;
        }
      }

      if (payload.assignedEmployeeId) {
        try {
          const [e] = await sql`SELECT id FROM employees WHERE id = ${payload.assignedEmployeeId} AND tenant_id = ${auth.tenantId!} LIMIT 1` as { id: string }[];
          if (!e) payload.assignedEmployeeId = null;
        } catch {
          payload.assignedEmployeeId = null;
        }
      }

      let rows: DbAsset[];
      try {
        rows = await sql`
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
      } catch (insertErr: unknown) {
        const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
        if (errMsg.includes('unique') || errMsg.includes('duplicate') || (insertErr as { code?: string })?.code === '23505') {
          return error(`Asset tag "${payload.assetTag}" already exists. Please choose a different tag.`, 409);
        }
        if (errMsg.includes('department') || errMsg.includes('repair_cost') || errMsg.includes('specs') || errMsg.includes('image_url') || errMsg.includes('column') || (insertErr as { code?: string })?.code === '42703') {
          try {
            await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS department VARCHAR(255)`;
            await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS specs TEXT`;
            await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_url TEXT`;
            await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS repair_cost NUMERIC(12,2) DEFAULT 0`;
            await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS qr_code_data VARCHAR(500)`;

            rows = await sql`
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
          } catch {
            rows = await sql`
              INSERT INTO assets (
                id, tenant_id, asset_tag, name, category, manufacturer, model, serial_number,
                status, lifecycle_stage, purchase_date, purchase_cost, current_value, location,
                vendor_id, assigned_employee_id, warranty_expires_at, notes
              ) VALUES (
                ${payload.id}, ${payload.tenantId}, ${payload.assetTag}, ${payload.name},
                ${payload.category}, ${payload.manufacturer}, ${payload.model}, ${payload.serialNumber},
                ${payload.status}, ${payload.lifecycleStage}, ${payload.purchaseDate},
                ${payload.purchaseCost}, ${payload.currentValue}, ${payload.location},
                ${payload.vendorId}, ${payload.assignedEmployeeId}, ${payload.warrantyExpiresAt}, ${payload.notes}
              )
              RETURNING *
            ` as DbAsset[];
          }
        } else {
          throw insertErr;
        }
      }

      const asset = mapAsset(rows[0]);

      if (payload.assignedEmployeeId && body.assignedBy) {
        try {
          await sql`
            INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
            VALUES (
              ${auth.tenantId!}, ${asset.id}, ${payload.assignedEmployeeId},
              ${String(body.assignedBy)}, ${body.assignmentNotes ? String(body.assignmentNotes) : 'Assigned on create'}
            )
          `;
        } catch (assignErr) {
          console.warn('Non-fatal asset_assignment error:', assignErr);
        }
        try {
          await sql`
            INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
            VALUES (
              ${auth.tenantId!}, ${asset.id}, 'ASSIGNED', 'Asset assigned to employee',
              ${String(body.assignedBy)}
            )
          `;
        } catch {
          try {
            await sql`
              INSERT INTO asset_ownership_history (tenant_id, asset_id, event_type, to_status, to_employee_id, performed_by, notes)
              VALUES (
                ${auth.tenantId!}, ${asset.id}, 'ASSIGNED', 'deployed',
                ${payload.assignedEmployeeId}, ${String(body.assignedBy)},
                ${body.assignmentNotes ? String(body.assignmentNotes) : 'Assigned on create'}
              )
            `;
          } catch {
            /* ignore history schema variations */
          }
        }
      }

      try {
        const audit = (body.audit && typeof body.audit === 'object') ? (body.audit as Record<string, string>) : null;
        await insertAuditLog({
          tenantId: auth.tenantId!,
          userId: auth.sub ?? null,
          userName: audit?.userName ?? (body.assignedBy ? String(body.assignedBy) : `${auth.firstName} ${auth.lastName}`),
          action: 'CREATE',
          entityType: 'asset',
          entityId: asset.id,
          entityLabel: asset.assetTag,
          details: audit?.details ?? `Created ${asset.name}`,
        });
      } catch {
        /* Non-blocking: audit log errors should never prevent user operations */
      }

      return json(asset, 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('unique') || message.includes('duplicate') || (e as { code?: string })?.code === '23505') {
      return error('An asset with this tag already exists in your fleet. Please use a unique asset tag.', 409);
    }
    return error(message, 500);
  }
}
