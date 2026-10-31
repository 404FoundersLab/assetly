import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, signAuthToken, verifyPassword, insertAuditLog } from '../_lib/auth';
import {
  buildOtpAuthUri,
  ensureMfaTable,
  generateSecret,
  getMfaRecord,
  isMfaEnforced,
  verifyTotp,
} from '../_lib/mfa';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  // Accept tokens issued while MFA enrollment is still pending (admin-enforced MFA).
  const auth = await requireAuth(req, { allowMfaPending: true });
  if (auth instanceof Response) return auth;

  const email = String(auth.email ?? '').toLowerCase();

  try {
    if (req.method === 'GET') {
      const rec = await getMfaRecord(email);
      const enforced = await isMfaEnforced(email, auth.tenantId);
      return json({ enabled: Boolean(rec?.enabled), enforced });
    }
    if (req.method !== 'POST') return error('Method not allowed', 405);

    const body = await parseBody<{ action?: string; code?: string; password?: string }>(req);
    const action = body.action;
    const sql = getSql();
    await ensureMfaTable();

    if (action === 'setup') {
      const existing = await getMfaRecord(email);
      if (existing?.enabled) return error('MFA is already enabled', 400);
      const secret = generateSecret();
      await sql`
        INSERT INTO user_mfa (email, secret, enabled, updated_at)
        VALUES (${email}, ${secret}, false, NOW())
        ON CONFLICT (email) DO UPDATE SET secret = ${secret}, enabled = false, updated_at = NOW()
      `;
      return json({ secret, otpauthUri: buildOtpAuthUri(email, secret) });
    }

    if (action === 'enable') {
      const rec = await getMfaRecord(email);
      if (!rec) return error('Start MFA setup first', 400);
      if (!(await verifyTotp(rec.secret, String(body.code ?? '')))) {
        return error('Invalid verification code', 400);
      }
      await sql`UPDATE user_mfa SET enabled = true, updated_at = NOW() WHERE email = ${email}`;
      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'user',
        entityId: auth.sub,
        entityLabel: email,
        details: 'MFA enabled',
      });
      // Upgrade a pending-enrollment token to a full session token.
      const token = auth.mfaPending
        ? await signAuthToken({
            id: auth.sub,
            email: auth.email,
            role: auth.role,
            firstName: auth.firstName,
            lastName: auth.lastName,
            tenantId: auth.tenantId,
            employeeId: auth.employeeId,
          })
        : undefined;
      return json({ enabled: true, ...(token ? { token } : {}) });
    }

    if (action === 'disable') {
      if (auth.mfaPending) return error('MFA enrollment is required', 403);
      if (await isMfaEnforced(email, auth.tenantId)) {
        return error('MFA is required by your administrator and cannot be disabled', 403);
      }
      const rec = await getMfaRecord(email);
      if (!rec?.enabled) return error('MFA is not enabled', 400);
      if (!(await verifyPassword(email, String(body.password ?? '')))) {
        return error('Password is incorrect', 401);
      }
      if (!(await verifyTotp(rec.secret, String(body.code ?? '')))) {
        return error('Invalid verification code', 400);
      }
      await sql`DELETE FROM user_mfa WHERE email = ${email}`;
      await insertAuditLog({
        tenantId: auth.tenantId,
        userId: auth.sub,
        userName: `${auth.firstName} ${auth.lastName}`,
        action: 'UPDATE',
        entityType: 'user',
        entityId: auth.sub,
        entityLabel: email,
        details: 'MFA disabled',
      });
      return json({ enabled: false });
    }

    return error('Unknown action', 400);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'MFA request failed', 500);
  }
}

