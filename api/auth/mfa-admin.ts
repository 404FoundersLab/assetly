import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, insertAuditLog } from '../_lib/auth';
import { ensureMfaPolicyTables, ensureMfaTable } from '../_lib/mfa';

export const config = { runtime: 'edge' };

/** Platform-admin MFA management: enforce per organization / user, or reset a user's MFA (like the M365 admin center). */
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'platform_admin') {
    return error('Forbidden: Only platform admins can manage MFA policy', 403);
  }

  try {
    const sql = getSql();
    await ensureMfaTable();
    await ensureMfaPolicyTables();

    if (req.method === 'GET') {
      const tenantId = new URL(req.url).searchParams.get('tenantId');
      if (!tenantId) return error('tenantId is required', 400);

      const t = (await sql`
        SELECT 1 FROM mfa_enforced_tenants WHERE tenant_id = ${tenantId} LIMIT 1
      `) as unknown[];
      const rows = (await sql`
        SELECT u.email, u.first_name, u.last_name, u.role,
               COALESCE(m.enabled, false) AS enrolled,
               (eu.email IS NOT NULL) AS enforced
        FROM users u
        LEFT JOIN user_mfa m ON lower(m.email) = lower(u.email)
        LEFT JOIN mfa_enforced_users eu ON lower(eu.email) = lower(u.email)
        WHERE u.tenant_id = ${tenantId}
        ORDER BY u.email
      `) as {
        email: string;
        first_name: string;
        last_name: string | null;
        role: string;
        enrolled: boolean;
        enforced: boolean;
      }[];

      return json({
        tenantEnforced: t.length > 0,
        users: rows.map((r) => ({
          email: r.email,
          name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
          role: r.role,
          enrolled: r.enrolled,
          enforced: r.enforced,
        })),
      });
    }

    if (req.method !== 'POST') return error('Method not allowed', 405);

    const body = await parseBody<{
      action?: string;
      tenantId?: string;
      email?: string;
      enforced?: boolean;
    }>(req);

    const audit = (entityId: string, label: string, details: string) =>
      insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'mfa_policy',
        entityId,
        entityLabel: label,
        details,
      });

    if (body.action === 'setTenantEnforced') {
      const tenantId = String(body.tenantId ?? '');
      if (!tenantId) return error('tenantId is required', 400);
      if (body.enforced) {
        await sql`
          INSERT INTO mfa_enforced_tenants (tenant_id) VALUES (${tenantId})
          ON CONFLICT (tenant_id) DO UPDATE SET updated_at = NOW()
        `;
      } else {
        await sql`DELETE FROM mfa_enforced_tenants WHERE tenant_id = ${tenantId}`;
      }
      await audit(tenantId, tenantId, `MFA ${body.enforced ? 'required' : 'not required'} for organization`);
      return json({ success: true });
    }

    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email) return error('email is required', 400);

    if (body.action === 'setUserEnforced') {
      if (body.enforced) {
        await sql`
          INSERT INTO mfa_enforced_users (email) VALUES (${email})
          ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        `;
      } else {
        await sql`DELETE FROM mfa_enforced_users WHERE email = ${email}`;
      }
      await audit(email, email, `MFA ${body.enforced ? 'required' : 'not required'} for user`);
      return json({ success: true });
    }

    if (body.action === 'resetUser') {
      await sql`DELETE FROM user_mfa WHERE email = ${email}`;
      await audit(email, email, 'MFA reset by platform admin');
      return json({ success: true });
    }

    return error('Unknown action', 400);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'MFA admin request failed', 500);
  }
}

