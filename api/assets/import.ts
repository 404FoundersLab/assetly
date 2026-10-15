import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { assetInsertPayload, mapAsset, type DbAsset } from '../_lib/mappers';
import { requireAuth } from '../_lib/auth';

export const config = { runtime: 'edge' };

interface ImportBody {
  items: Record<string, unknown>[];
  employees?: Record<string, unknown>[];
  assignedBy?: string;
  audit?: Record<string, string>;
  qrOrigin?: string;
  /** When true, deletes all existing assets/employees before importing. Default: false (additive import). */
  replaceAll?: boolean;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId! && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  try {
    const sql = await getTenantSql(auth.tenantId!);
    const body = await parseBody<ImportBody>(req);
    const items = body.items ?? [];
    const employees = body.employees ?? [];

    if (items.length === 0) return error('No assets to import', 400);

    // 0. Ensure schema compatibility for repair_cost
    try {
      await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS repair_cost NUMERIC(12, 2) DEFAULT 0`;
    } catch {
      /* ignore if already present or permission denied */
    }

    // Only wipe existing data when the caller explicitly requests a full replace
    if (body.replaceAll === true) {
      await sql`DELETE FROM ownership_history WHERE tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM asset_assignments WHERE tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM assets WHERE tenant_id = ${auth.tenantId!}`;
      await sql`DELETE FROM employees WHERE tenant_id = ${auth.tenantId!}`;
    }

    // 1. Fetch valid reference data to safeguard foreign key constraints
    const existingEmps = await sql`
      SELECT id, email, employee_number, LOWER(TRIM(first_name || ' ' || last_name)) as full_name
      FROM employees
      WHERE tenant_id = ${auth.tenantId!}
    ` as { id: string; email: string; employee_number: string | null; full_name: string }[];

    const validEmployeeIds = new Set<string>(existingEmps.map((e) => e.id));
    const empIdByEmail = new Map<string, string>();
    const empIdByNumber = new Map<string, string>();
    const empIdByName = new Map<string, string>();

    for (const e of existingEmps) {
      if (e.email) empIdByEmail.set(e.email.toLowerCase().trim(), e.id);
      if (e.employee_number) empIdByNumber.set(e.employee_number.trim(), e.id);
      if (e.full_name) empIdByName.set(e.full_name, e.id);
    }

    const existingDepts = await sql`
      SELECT id FROM departments WHERE tenant_id = ${auth.tenantId!}
    ` as { id: string }[];
    const validDeptIds = new Set<string>(existingDepts.map((d) => d.id));

    const existingVendors = await sql`
      SELECT id FROM vendors WHERE tenant_id = ${auth.tenantId!}
    ` as { id: string }[];
    const validVendorIds = new Set<string>(existingVendors.map((v) => v.id));

    // 2. Import or match employees safely
    const empIdMap = new Map<string, string>();

    for (const emp of employees) {
      const oldId = String(emp.id ?? '').trim();
      let departmentId = emp.departmentId ? String(emp.departmentId) : null;
      if (departmentId && (!isUuid(departmentId) || !validDeptIds.has(departmentId))) {
        departmentId = null;
      }

      const firstName = String(emp.firstName ?? '').trim() || 'Employee';
      const lastName = String(emp.lastName ?? '').trim() || 'Staff';
      const fullName = `${firstName} ${lastName}`.toLowerCase().trim();
      const fallbackTag = (isUuid(oldId) ? oldId : crypto.randomUUID()).slice(0, 8);
      const email =
        String(emp.email ?? '').trim().toLowerCase() ||
        `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${fallbackTag}@solum-group.com`;
      let empNum = emp.employeeNumber ? String(emp.employeeNumber).trim() || null : null;

      let effectiveId: string | null = null;

      // Check if employee already exists in DB
      if (empIdByEmail.has(email)) {
        effectiveId = empIdByEmail.get(email)!;
      } else if (empNum && empIdByNumber.has(empNum)) {
        effectiveId = empIdByNumber.get(empNum)!;
      } else if (empIdByName.has(fullName)) {
        effectiveId = empIdByName.get(fullName)!;
      } else if (isUuid(oldId) && validEmployeeIds.has(oldId)) {
        effectiveId = oldId;
      }

      if (effectiveId) {
        // Update employee details
        try {
          await sql`
            UPDATE employees SET
              first_name = ${firstName},
              last_name = ${lastName},
              job_title = COALESCE(NULLIF(${String(emp.jobTitle ?? '')}, ''), job_title),
              status = COALESCE(NULLIF(${String(emp.status ?? '')}, ''), status)
            WHERE id = ${effectiveId} AND tenant_id = ${auth.tenantId!}
          `;
        } catch (updErr) {
          console.warn('Could not update employee details:', updErr);
        }
      } else {
        // Avoid duplicate employee_number collision
        if (empNum && empIdByNumber.has(empNum)) {
          empNum = null;
        }

        const newId = isUuid(oldId) && !validEmployeeIds.has(oldId) ? oldId : crypto.randomUUID();

        try {
          const empRows = await sql`
            INSERT INTO employees (
              id, tenant_id, employee_number, first_name, last_name, email,
              job_title, department_id, status, hire_date
            ) VALUES (
              ${newId}, ${auth.tenantId!}, ${empNum},
              ${firstName}, ${lastName},
              ${email}, ${String(emp.jobTitle ?? 'Staff')},
              ${departmentId}, ${String(emp.status ?? 'active')},
              ${emp.hireDate ? String(emp.hireDate) : null}
            )
            ON CONFLICT (tenant_id, email) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name
            RETURNING id
          ` as { id: string }[];

          effectiveId = empRows[0]?.id || newId;
        } catch (empErr) {
          console.warn('Could not insert employee:', empErr);
          try {
            const fallback = await sql`
              SELECT id FROM employees WHERE tenant_id = ${auth.tenantId!} AND email = ${email} LIMIT 1
            ` as { id: string }[];
            if (fallback.length > 0) {
              effectiveId = fallback[0].id;
            }
          } catch {
            /* ignore fallback error */
          }
        }
      }

      if (effectiveId) {
        validEmployeeIds.add(effectiveId);
        if (oldId) empIdMap.set(oldId, effectiveId);
        empIdMap.set(effectiveId, effectiveId);
        empIdByEmail.set(email, effectiveId);
        if (empNum) empIdByNumber.set(empNum, effectiveId);
        empIdByName.set(fullName, effectiveId);
      }
    }

    const created: ReturnType<typeof mapAsset>[] = [];

    for (const item of items) {
      const itemCopy: Record<string, unknown> = { ...item, qrOrigin: body.qrOrigin };
      let resolvedEmployeeId: string | null = null;
      const rawAssigned = item.assignedEmployeeId ? String(item.assignedEmployeeId).trim() : null;

      if (rawAssigned) {
        if (empIdMap.has(rawAssigned)) {
          resolvedEmployeeId = empIdMap.get(rawAssigned)!;
        } else if (validEmployeeIds.has(rawAssigned)) {
          resolvedEmployeeId = rawAssigned;
        } else if (empIdByEmail.has(rawAssigned.toLowerCase())) {
          resolvedEmployeeId = empIdByEmail.get(rawAssigned.toLowerCase())!;
        } else if (empIdByNumber.has(rawAssigned)) {
          resolvedEmployeeId = empIdByNumber.get(rawAssigned)!;
        } else if (empIdByName.has(rawAssigned.toLowerCase())) {
          resolvedEmployeeId = empIdByName.get(rawAssigned.toLowerCase())!;
        }
      }

      // Check name fallback if not resolved yet
      if (!resolvedEmployeeId && item.assignedEmployeeName) {
        const nameKey = String(item.assignedEmployeeName).trim().toLowerCase();
        if (empIdByName.has(nameKey)) {
          resolvedEmployeeId = empIdByName.get(nameKey)!;
        }
      }

      // CRITICAL GUARANTEE: Never insert an assignedEmployeeId that is not present in PostgreSQL employees table
      if (resolvedEmployeeId && !validEmployeeIds.has(resolvedEmployeeId)) {
        console.warn(`Asset tag "${item.assetTag}": assigned employee "${rawAssigned}" not in DB. Setting to null.`);
        resolvedEmployeeId = null;
      }

      itemCopy.assignedEmployeeId = resolvedEmployeeId;
      itemCopy.id = crypto.randomUUID();

      const payload = assetInsertPayload(itemCopy, auth.tenantId!);

      // Guard vendor_id against foreign key failure
      if (payload.vendorId && !validVendorIds.has(payload.vendorId)) {
        payload.vendorId = null;
      }
      // Re-guard assignedEmployeeId against foreign key failure
      if (payload.assignedEmployeeId && !validEmployeeIds.has(payload.assignedEmployeeId)) {
        payload.assignedEmployeeId = null;
      }

      const rows = await sql`
        INSERT INTO assets (
          id, tenant_id, asset_tag, name, category, manufacturer, model, serial_number,
          status, lifecycle_stage, purchase_date, purchase_cost, current_value, repair_cost, location,
          department, specs, image_url, vendor_id, assigned_employee_id, warranty_expires_at,
          notes, qr_code_data
        ) VALUES (
          ${payload.id}, ${payload.tenantId},
          ${payload.assetTag}, ${payload.name}, ${payload.category}, ${payload.manufacturer},
          ${payload.model}, ${payload.serialNumber}, ${payload.status}, ${payload.lifecycleStage},
          ${payload.purchaseDate}, ${payload.purchaseCost}, ${payload.currentValue}, ${payload.repairCost},
          ${payload.location}, ${payload.department}, ${payload.specs}, ${payload.imageUrl},
          ${payload.vendorId}, ${payload.assignedEmployeeId}, ${payload.warrantyExpiresAt},
          ${payload.notes}, ${payload.qrCodeData}
        )
        ON CONFLICT (tenant_id, asset_tag) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          manufacturer = EXCLUDED.manufacturer,
          model = EXCLUDED.model,
          serial_number = EXCLUDED.serial_number,
          status = EXCLUDED.status,
          location = EXCLUDED.location,
          assigned_employee_id = EXCLUDED.assigned_employee_id,
          warranty_expires_at = EXCLUDED.warranty_expires_at,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      ` as DbAsset[];

      if (rows.length > 0) {
        const asset = mapAsset(rows[0]);
        created.push(asset);

        if (payload.assignedEmployeeId && validEmployeeIds.has(payload.assignedEmployeeId) && body.assignedBy) {
          try {
            await sql`
              INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
              VALUES (
                ${auth.tenantId!}, ${asset.id}, ${payload.assignedEmployeeId},
                ${body.assignedBy}, 'Imported from Excel'
              )
            `;
            await sql`
              INSERT INTO ownership_history (tenant_id, asset_id, event_type, description, performed_by)
              VALUES (
                ${auth.tenantId!}, ${asset.id}, 'ASSIGNED', 'Assigned during Excel import',
                ${body.assignedBy}
              )
            `;
          } catch (assignErr) {
            console.warn('Assignment insert warning:', assignErr);
          }
        }
      }
    }

    if (body.audit) {
      const audit = body.audit;
      try {
        await sql`
          INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id, entity_label, details)
          VALUES (
            ${auth.tenantId!}, ${audit.userId ?? null}, ${audit.userName ?? null},
            ${audit.action ?? 'CREATE'}, ${audit.entityType ?? 'asset'}, ${audit.entityId ?? 'bulk-import'},
            ${audit.entityLabel ?? 'Bulk Import'}, ${audit.details ?? null}
          )
        `;
      } catch {
        /* audit log non-fatal */
      }
    }

    return json({ imported: created.length, assets: created }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Import failed';
    return error(message, 500);
  }
}
