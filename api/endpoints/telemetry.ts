import { getSql, json, error, corsPreflight } from '../_lib/db';
import { assertAgentAuthorized } from '../_lib/security';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const agentAuth = assertAgentAuthorized(req, error);
  if (agentAuth) return agentAuth;

  try {
    const body = await req.json() as Record<string, unknown>;
    const { endpoint_id, cpu_usage, memory_total, memory_used, running_processes, firewall_status, defender_status, antivirus_updated_at, active_ports, last_logged_user, uptime_seconds, last_reboot_at, agent_version, bitlocker_status, bitlocker_drive, threats, command_results } = body as Record<string, any>;

    if (!endpoint_id || typeof endpoint_id !== 'string') {
      return error('endpoint_id is required', 400);
    }

    const sql = getSql();

    // Verify endpoint exists (tenant isolation is enforced by endpoint ownership)
    const [existing] = await sql`
      SELECT id, tenant_id FROM endpoints WHERE id = ${endpoint_id} LIMIT 1
    `;

    if (!existing) {
      return error('Endpoint not found', 404);
    }

    // Insert telemetry
    await sql`
      INSERT INTO endpoint_telemetry (endpoint_id, cpu_usage, memory_total, memory_used, running_processes)
      VALUES (${endpoint_id}, ${cpu_usage}, ${memory_total}, ${memory_used}, ${JSON.stringify(running_processes)})
    `;

    // Update last_seen and security status
    await sql`
      UPDATE endpoints SET 
        last_seen_at = CURRENT_TIMESTAMP,
        firewall_status = ${firewall_status || existing.firewall_status || null},
        defender_status = ${defender_status || existing.defender_status || null},
        antivirus_updated_at = ${antivirus_updated_at || existing.antivirus_updated_at || null},
        active_ports = ${active_ports ? JSON.stringify(active_ports) : existing.active_ports || null},
        last_logged_user = ${last_logged_user || existing.last_logged_user || null},
        uptime_seconds = ${uptime_seconds || existing.uptime_seconds || null},
        last_reboot_at = ${last_reboot_at || existing.last_reboot_at || null},
        agent_version = ${agent_version || existing.agent_version || null},
        bitlocker_status = ${bitlocker_status || existing.bitlocker_status || null},
        bitlocker_drive = ${bitlocker_drive || existing.bitlocker_drive || null}
      WHERE id = ${endpoint_id}
    `;

    // Process threats
    if (Array.isArray(threats)) {
      await sql`DELETE FROM endpoint_threats WHERE endpoint_id = ${endpoint_id}`;
      if (threats.length > 0) {
        for (const t of threats) {
          await sql`
            INSERT INTO endpoint_threats (endpoint_id, threat_type, severity, description, detected_at, resolved)
            VALUES (${endpoint_id}, ${t.threat_type}, ${t.severity}, ${t.description}, ${t.detected_at}, ${t.resolved})
          `;
        }
      }
    }

    // Process command results
    if (Array.isArray(command_results) && command_results.length > 0) {
      for (const res of command_results) {
        await sql`
          UPDATE endpoint_commands 
          SET status = ${res.status}, result = ${res.result}, completed_at = CURRENT_TIMESTAMP
          WHERE id = ${res.id}
        `;
      }
    }

    // Fetch pending commands
    const pendingCommands = await sql`
      SELECT id, command FROM endpoint_commands 
      WHERE endpoint_id = ${endpoint_id} AND status = 'pending'
      ORDER BY created_at ASC
    `;

    if (pendingCommands.length > 0) {
      const ids = pendingCommands.map(c => c.id);
      await sql`
        UPDATE endpoint_commands SET status = 'sent' WHERE id = ANY(${ids}::int[])
      `;
    }

    return json({ status: 'success', pending_commands: pendingCommands });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Telemetry update failed', 500);
  }
}
