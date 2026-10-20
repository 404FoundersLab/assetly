import { getTenantSql, json, error, corsPreflight } from '../../_lib/db';
import { requireAuth, canManageEndpoints } from '../../_lib/auth';
import { assertAgentAuthorized } from '../../_lib/security';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.indexOf('endpoints') + 1];

  if (!id) return error('Endpoint ID is required', 400);

  const isAgent = url.searchParams.get('role') === 'agent';

  // 1. Authentication
  let tenantId: string;
  if (isAgent) {
    const agentAuth = assertAgentAuthorized(req, error);
    if (agentAuth) return agentAuth;
    
    // For agent role, we need to lookup tenantId from endpoint
    const sql = await getTenantSql(''); // Fallback/shared db initially to find tenant
    const [ep] = await sql`SELECT tenant_id FROM endpoints WHERE id = ${id} LIMIT 1`;
    if (!ep) return error('Endpoint not found', 404);
    tenantId = ep.tenant_id;
  } else {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;
    if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
    if (!canManageEndpoints(auth.role)) return error('Forbidden', 403);
    tenantId = auth.tenantId!;
  }

  const sql = await getTenantSql(tenantId);

  // 2. Logic execution
  try {
    if (req.method === 'GET') {
      if (isAgent) {
        // Agent gets active status, consumes input queue, and reads new WebRTC signals
        const since = Number(url.searchParams.get('since') || 0) || 0;
        const [session] = await sql`
          UPDATE remote_desktop_sessions 
          SET input_queue = '[]'::jsonb, updated_at = NOW()
          WHERE endpoint_id = ${id}
          RETURNING is_active, (
            SELECT input_queue FROM remote_desktop_sessions WHERE endpoint_id = ${id}
          ) AS old_queue
        `;
        if (!session) {
          // Initialize session row if it doesn't exist
          await sql`
            INSERT INTO remote_desktop_sessions (endpoint_id, is_active)
            VALUES (${id}, false)
            ON CONFLICT (endpoint_id) DO NOTHING
          `;
          return json({ is_active: false, input_queue: [], signals: [] });
        }
        const signals = session.is_active
          ? await sql`
              SELECT id, payload FROM remote_signals
              WHERE endpoint_id = ${id} AND direction = 'to_agent' AND id > ${since}
              ORDER BY id ASC LIMIT 100
            `
          : [];
        return json({
          is_active: session.is_active,
          input_queue: session.old_queue || [],
          signals
        });
      } else {
        // Dashboard gets latest frame (unless lite), command result and new WebRTC signals
        const lite = url.searchParams.get('mode') === 'lite';
        const since = Number(url.searchParams.get('since') || 0) || 0;
        const [session] = await sql`
          UPDATE remote_desktop_sessions 
          SET command_result = null
          WHERE endpoint_id = ${id}
          RETURNING is_active, (
            SELECT command_result FROM remote_desktop_sessions WHERE endpoint_id = ${id}
          ) AS old_command_result
        `;
        const signals = await sql`
          SELECT id, payload FROM remote_signals
          WHERE endpoint_id = ${id} AND direction = 'to_viewer' AND id > ${since}
          ORDER BY id ASC LIMIT 100
        `;
        let lastFrame: string | null = null;
        if (!lite && session?.is_active) {
          const [f] = await sql`SELECT last_frame FROM remote_desktop_sessions WHERE endpoint_id = ${id}`;
          lastFrame = f?.last_frame ?? null;
        }
        return json({
          is_active: session ? session.is_active : false,
          last_frame: lastFrame,
          command_result: session ? session.old_command_result : null,
          signals
        });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json() as Record<string, any>;

      if (isAgent) {
        // Agent updates frame and/or command result
        const { frame, commandResult, signal } = body;
        if (signal) {
          await sql`INSERT INTO remote_signals (endpoint_id, direction, payload) VALUES (${id}, 'to_viewer', ${JSON.stringify(signal)}::jsonb)`;
          return json({ success: true });
        }
        await sql`
          INSERT INTO remote_desktop_sessions (endpoint_id, is_active, last_frame, command_result, updated_at)
          VALUES (${id}, true, ${frame || null}, ${commandResult || null}, NOW())
          ON CONFLICT (endpoint_id) DO UPDATE 
          SET 
            last_frame = COALESCE(${frame || null}, remote_desktop_sessions.last_frame), 
            command_result = COALESCE(${commandResult || null}, remote_desktop_sessions.command_result), 
            updated_at = NOW()
        `;
        return json({ success: true });
      } else {
        // Dashboard actions: start, stop, input, command
        const { action, input, command, signal } = body;

        if (action === 'start') {
          await sql`DELETE FROM remote_signals WHERE endpoint_id = ${id}`;
          // Set session active, queue start-remote command for immediate pickup
          await sql`
            INSERT INTO remote_desktop_sessions (endpoint_id, is_active, last_frame, input_queue, updated_at)
            VALUES (${id}, true, null, '[]'::jsonb, NOW())
            ON CONFLICT (endpoint_id) DO UPDATE 
            SET is_active = true, last_frame = null, input_queue = '[]'::jsonb, updated_at = NOW()
          `;

          await sql`
            INSERT INTO endpoint_commands (endpoint_id, command, status)
            VALUES (${id}, 'start-remote', 'pending')
          `;
          return json({ success: true, message: 'Session started and command queued' });
        }

        if (action === 'stop') {
          await sql`DELETE FROM remote_signals WHERE endpoint_id = ${id}`;
          await sql`
            UPDATE remote_desktop_sessions 
            SET is_active = false, last_frame = null, input_queue = '[]'::jsonb, updated_at = NOW()
            WHERE endpoint_id = ${id}
          `;

          await sql`
            INSERT INTO endpoint_commands (endpoint_id, command, status)
            VALUES (${id}, 'stop-remote', 'pending')
          `;
          return json({ success: true, message: 'Session stopped' });
        }

        if (action === 'signal' && signal) {
          await sql`INSERT INTO remote_signals (endpoint_id, direction, payload) VALUES (${id}, 'to_agent', ${JSON.stringify(signal)}::jsonb)`;
          return json({ success: true });
        }

        if (action === 'input' && input) {
          await sql`
            UPDATE remote_desktop_sessions 
            SET input_queue = input_queue || ${JSON.stringify(input)}::jsonb, updated_at = NOW()
            WHERE endpoint_id = ${id}
          `;
          return json({ success: true });
        }

        if (action === 'command' && command) {
          const inputObj = { type: 'command', command };
          await sql`
            UPDATE remote_desktop_sessions 
            SET input_queue = input_queue || ${JSON.stringify(inputObj)}::jsonb, updated_at = NOW()
            WHERE endpoint_id = ${id}
          `;
          return json({ success: true });
        }

        return error('Invalid action', 400);
      }
    }

    return error('Method not allowed', 405);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Relay request failed', 500);
  }
}
