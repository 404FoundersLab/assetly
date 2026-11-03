import { getSql, json, error, corsPreflight } from '../_lib/db';
import { validateBody, z } from '../_lib/validate';
import { requireAuth, signAuthToken, verifyPassword, insertAuditLog } from '../_lib/auth';
import {
  buildOtpAuthUri,
  ensureMfaTable,
  generateSecret,
  getMfaRecord,
  generateRecoveryCodes,
  isMfaEnforced,
  saveMfaSecret,
  verifyMfaWithLockout,
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

    const parsed = await validateBody(req, z.object({
      action: z.enum(['setup', 'enable', 'disable']),
      code: z.string().max(32).optional(),
      password: z.string().max(256).optional(),
    }));
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const action = body.action;
    const sql = getSql();
    await ensureMfaTable();

    if (action === 'setup') {
      const existing = await getMfaRecord(email);
      if (existing?.enabled) return error('MFA is already enabled', 400);
      const secret = generateSecret();
      await saveMfaSecret(email, secret);
      return json({ secret, otpauthUri: buildOtpAuthUri(email, secret) });
    }

    if (action === 'enable') {
      const rec = await getMfaRecord(email);
      if (!rec) return error('Start MFA setup first', 400);
      const check = await verifyMfaWithLockout(email, rec.secret, String(body.code ?? ''));
      if (check === 'locked') return error('Too many failed attempts. Try again later.', 429);
      if (check !== 'ok') return error('Invalid verification code', 400);
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
      const recoveryCodes = await generateRecoveryCodes(email);
      return json({ enabled: true, recoveryCodes, ...(token ? { token } : {}) });
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
      const dcheck = await verifyMfaWithLockout(email, rec.secret, String(body.code ?? ''));
      if (dcheck === 'locked') return error('Too many failed attempts. Try again later.', 429);
      if (dcheck !== 'ok') return error('Invalid verification code', 400);
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

