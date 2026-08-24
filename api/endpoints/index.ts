import { getTenantSql, json, error, corsPreflight } from '../_lib/db';
import { requireAuth } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  try {
    const sql = await getTenantSql(auth.tenantId!);
    let endpoints;
    try {
      endpoints = await sql`
        SELECT
          e.id, e.hostname, e.serial_number, e.os_version, e.ip_address, e.mac_address,
          e.status, e.last_seen_at, e.cpu_model, e.ram_total_gb, e.storage_total_gb,
          e.windows_updates, e.firewall_status, e.defender_status,
          e.antivirus_updated_at, e.active_ports, e.last_logged_user, e.uptime_seconds,
          e.last_reboot_at, e.agent_version, e.bitlocker_status, e.bitlocker_drive,
          CASE
            WHEN emp.id IS NOT NULL
            THEN emp.first_name || ' ' || emp.last_name
            ELSE NULL
          END AS assigned_employee_name
        FROM endpoints e
        LEFT JOIN assets a
          ON a.serial_number = e.serial_number
          AND a.serial_number IS NOT NULL
          AND e.serial_number IS NOT NULL
          AND a.tenant_id = ${auth.tenantId!}
        LEFT JOIN asset_assignments aa
          ON aa.asset_id = a.id
          AND aa.returned_at IS NULL
        LEFT JOIN employees emp
          ON emp.id = aa.employee_id
          AND emp.tenant_id = ${auth.tenantId!}
        WHERE e.tenant_id = ${auth.tenantId!}
        ORDER BY e.last_seen_at DESC
      `;
    } catch (queryErr) {
      // Fallback query if serial_number column or JOIN fails
      endpoints = await sql`
        SELECT
          id, hostname, NULL AS serial_number, os_version, ip_address, mac_address,
          status, last_seen_at, cpu_model, ram_total_gb, storage_total_gb,
          windows_updates, firewall_status, defender_status,
          antivirus_updated_at, active_ports, last_logged_user, uptime_seconds,
          last_reboot_at, agent_version, bitlocker_status, bitlocker_drive,
          NULL AS assigned_employee_name
        FROM endpoints
        WHERE tenant_id = ${auth.tenantId!}
        ORDER BY last_seen_at DESC
      `;
    }

    return json({ endpoints });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Failed to fetch endpoints', 500);
  }
}
