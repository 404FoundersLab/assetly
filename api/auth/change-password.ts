import { getSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, hashPassword, verifyPassword, insertAuditLog } from '../_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseBody<{ currentPassword?: string; newPassword?: string }>(req);
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!newPassword) {
      return error('New password is required', 400);
    }
    if (newPassword.length < 8) {
      return error('New password must be at least 8 characters', 400);
    }

    const email = String(auth.email ?? '').toLowerCase();

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
      await sql`
        INSERT INTO user_passwords (email, password_hash, updated_at, must_change_password)
        VALUES (${email}, ${passwordHash}, NOW(), false)
        ON CONFLICT (email) DO UPDATE SET password_hash = ${passwordHash}, updated_at = NOW(), must_change_password = false
      `;
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

    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Password change failed', 500);
  }
}
