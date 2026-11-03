import { getSql, json, error, corsPreflight } from '../_lib/db';
import { validateBody, z } from '../_lib/validate';
import { requireAuth, hashPassword, verifyPassword, insertAuditLog, signAuthToken } from '../_lib/auth';
import { validateNewPassword } from '../_lib/password-policy';
import { consume, tooManyRequests } from '../_lib/ratelimit';
import { issueRefreshToken, revokeAllForUser, sessionCookies } from '../_lib/session';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const limit = await consume(`change-pw:${auth.sub}`, 5, 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSec);
    const parsed = await validateBody(req, z.object({
      currentPassword: z.string().max(256).optional(),
      newPassword: z.string().max(256).optional(),
    }));
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!newPassword) {
      return error('New password is required', 400);
    }
    const email = String(auth.email ?? '').toLowerCase();
    const policyProblem = await validateNewPassword(newPassword, { email });
    if (policyProblem) return error(policyProblem, 400);

    // For first-time password setup, currentPassword may be empty if no password is set yet
    if (currentPassword) {
      const valid = await verifyPassword(email, currentPassword);
      if (!valid) return error('Current password is incorrect', 401);
    } else {
      // Ensure this is genuinely a first-time setup (no real password stored)
      try {
        const sql = getSql();
        const rows = await sql`
          SELECT password_hash, must_change_password FROM user_passwords WHERE email = ${email}
        ` as { password_hash: string; must_change_password?: boolean }[];
        const dbUser = rows[0];
        const hasPassword =
          rows.length > 0 &&
          dbUser?.password_hash &&
          dbUser.password_hash !== 'seed-placeholder' &&
          dbUser.password_hash !== 'optional-on-first-login';

        if (hasPassword && !dbUser?.must_change_password) {
          return error('Current password is required', 400);
        }
      } catch {
        return error('Current password is required', 400);
      }
    }

    const sql = getSql();
    const passwordHash = await hashPassword(newPassword);
    try {
      const existingPw = (await sql`
        SELECT email FROM user_passwords WHERE lower(email) = ${email} LIMIT 1
      `) as { email: string }[];

      if (existingPw.length > 0) {
        await sql`
          UPDATE user_passwords
          SET password_hash = ${passwordHash}, updated_at = NOW(), must_change_password = false
          WHERE lower(email) = ${email}
        `;
      } else {
        try {
          await sql`
            INSERT INTO user_passwords (email, password_hash, updated_at, must_change_password)
            VALUES (${email}, ${passwordHash}, NOW(), false)
          `;
        } catch {
          await sql`
            UPDATE user_passwords
            SET password_hash = ${passwordHash}, updated_at = NOW(), must_change_password = false
            WHERE lower(email) = ${email}
          `;
        }
      }

      // Also update users.password_hash if column exists
      try {
        await sql`
          UPDATE users
          SET password_hash = ${passwordHash}
          WHERE lower(email) = ${email}
        `;
      } catch {
        /* ignore */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('user_passwords')) {
        return error(
          'Password storage is not set up. Run database/supabase/003_user_passwords.sql in Neon, or run: node scripts/migrate-user-passwords.mjs',
          503,
        );
      }
      throw e;
    }

    await insertAuditLog({
      tenantId: auth.tenantId,
      userId: auth.sub,
      userName: `${auth.firstName} ${auth.lastName}`,
      action: 'UPDATE',
      entityType: 'user',
      entityId: auth.sub,
      entityLabel: email,
      details: 'Password changed',
    });

    await revokeAllForUser(auth.sub);
    const token = await signAuthToken({
      id: auth.sub,
      email: auth.email,
      role: auth.role,
      firstName: auth.firstName,
      lastName: auth.lastName,
      tenantId: auth.tenantId,
      employeeId: auth.employeeId,
    });
    const cookies = sessionCookies(token, await issueRefreshToken(auth.sub));
    return json({ success: true, token }, 200, { cookies });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Password change failed', 500);
  }
}
