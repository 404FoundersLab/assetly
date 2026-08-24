import { getSql, json, error, corsPreflight } from '../_lib/db';
import { assertAgentAuthorized } from '../_lib/security';
import { evaluateAppCves } from '../_lib/cve';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const agentAuth = assertAgentAuthorized(req, error);
  if (agentAuth) return agentAuth;

  try {
    const body = await req.json() as any;
    const { tenant_id, hostname, os_version, ip_address, mac_address, cpu_model, ram_total_gb, storage_total_gb, serial_number, windows_updates, installed_apps, firewall_status, defender_status, antivirus_updated_at } = body;

    if (!tenant_id || !hostname) {
      return error('tenant_id and hostname are required', 400);
    }

    const sql = getSql();
    
    // Check if endpoint exists by MAC or Hostname
    const [existing] = await sql`
      SELECT id FROM endpoints 
      WHERE tenant_id = ${tenant_id} AND (mac_address = ${mac_address} OR hostname = ${hostname})
      LIMIT 1
    `;

    let endpointId;

    if (existing) {
      // Update existing
      await sql`
        UPDATE endpoints 
        SET 
          hostname = ${hostname},
          os_version = ${os_version},
          ip_address = ${ip_address},
          last_seen_at = CURRENT_TIMESTAMP,
          status = 'active',
          cpu_model = ${cpu_model || null},
          ram_total_gb = ${ram_total_gb || null},
          storage_total_gb = ${storage_total_gb || null},
          serial_number = COALESCE(${serial_number || null}, serial_number),
          windows_updates = ${windows_updates ? JSON.stringify(windows_updates) : null},
          firewall_status = COALESCE(${firewall_status || null}, firewall_status),
          defender_status = COALESCE(${defender_status || null}, defender_status),
          antivirus_updated_at = COALESCE(${antivirus_updated_at || null}, antivirus_updated_at)
        WHERE id = ${existing.id}
      `;
      endpointId = existing.id;
    } else {
      // Insert new
      const [inserted] = await sql`
        INSERT INTO endpoints (
          tenant_id, hostname, os_version, ip_address, mac_address, status, last_seen_at, cpu_model, ram_total_gb, storage_total_gb, serial_number, windows_updates, firewall_status, defender_status, antivirus_updated_at
        )
        VALUES (
          ${tenant_id}, ${hostname}, ${os_version}, ${ip_address}, ${mac_address}, 'active', NOW(), ${cpu_model || null}, ${ram_total_gb || null}, ${storage_total_gb || null}, ${serial_number || null}, ${windows_updates ? JSON.stringify(windows_updates) : null}, ${firewall_status || null}, ${defender_status || null}, ${antivirus_updated_at || null}
        )
        RETURNING id
      `;
      endpointId = inserted.id;
    }

    if (Array.isArray(installed_apps)) {
      await sql`DELETE FROM endpoint_installed_apps WHERE endpoint_id = ${endpointId}`;
      if (installed_apps.length > 0) {
        for (const a of installed_apps) {
          try {
            const evalResult = evaluateAppCves(a.app_name, a.version);
            const cveCount = evalResult.cve_count || a.cve_count || 0;
            const cveIds = evalResult.cve_ids.length > 0 ? evalResult.cve_ids : (a.cve_ids || []);

            await sql`
              INSERT INTO endpoint_installed_apps (endpoint_id, app_name, version, publisher, install_date, cve_count, cve_ids)
              VALUES (${endpointId}, ${a.app_name}, ${a.version}, ${a.publisher}, ${a.install_date}, ${cveCount}, ${cveIds})
            `;
          } catch(e) {}
        }
      }
    }

    return json({ status: 'success', endpoint: { id: endpointId } });
  } catch (e) {
    console.error('Registration API error:', e);
    return error(e instanceof Error ? e.message : 'Registration failed', 500);
  }
}
