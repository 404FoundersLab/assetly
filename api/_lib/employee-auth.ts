type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
};

export function activeEmployeeLoginEmail(row: {
  official_email?: string | null;
  joining_email?: string | null;
  email?: string | null;
}): string {
  const official = row.official_email?.trim().toLowerCase();
  if (official) return official;
  const joining = row.joining_email?.trim().toLowerCase();
  if (joining) return joining;
  return (row.email ?? '').trim().toLowerCase();
}

/** Resolve employee record from the email used at sign-in. */
export async function resolveEmployeeIdByLoginEmail(
  sql: SqlClient,
  tenantId: string,
  loginEmail: string,
): Promise<string | null> {
  const normalized = loginEmail.trim().toLowerCase();
  if (!normalized) return null;

  const rows = (await sql`
    SELECT id FROM employees
    WHERE tenant_id = ${tenantId}
      AND (
        lower(COALESCE(official_email, joining_email, email)) = ${normalized}
        OR (official_email IS NULL AND lower(joining_email) = ${normalized})
        OR lower(email) = ${normalized}
      )
    LIMIT 1
  `) as { id: string }[];

  return rows[0]?.id ?? null;
}

/**
 * Move the employee portal login from one email to another.
 * The previous email loses sign-in access; password hash is preserved when possible.
 */
export async function migrateEmployeeLoginEmail(
  sql: SqlClient,
  tenantId: string,
  fromEmail: string,
  toEmail: string,
  firstName: string,
  lastName: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const from = fromEmail.trim().toLowerCase();
  const to = toEmail.trim().toLowerCase();

  if (!to) return { ok: false, message: 'Official email is required' };
  if (from === to) return { ok: true };

  const conflict = (await sql`
    SELECT id, role FROM users
    WHERE lower(email) = ${to}
    LIMIT 1
  `) as { id: string; role: string }[];

  const existingEmployeeUsers = (await sql`
    SELECT id, email FROM users
    WHERE tenant_id = ${tenantId} AND role = 'employee' AND lower(email) = ${from}
    LIMIT 1
  `) as { id: string; email: string }[];

  if (conflict.length > 0) {
    const sameAccount =
      existingEmployeeUsers.length > 0 && conflict[0].id === existingEmployeeUsers[0].id;
    if (!sameAccount) {
      return { ok: false, message: 'Official email is already used by another account' };
    }
  }

  if (existingEmployeeUsers.length > 0) {
    const userId = existingEmployeeUsers[0].id;
    await sql`
      UPDATE users
      SET email = ${to}, first_name = ${firstName}, last_name = ${lastName}
      WHERE id = ${userId}
    `;
  } else {
    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
      VALUES (${userId}, ${tenantId}, ${to}, ${firstName}, ${lastName}, 'employee')
      ON CONFLICT (tenant_id, email) DO UPDATE
      SET first_name = ${firstName}, last_name = ${lastName}, role = 'employee'
    `;
  }

  const passwordRows = (await sql`
    SELECT password_hash, must_change_password FROM user_passwords WHERE email = ${from}
  `) as { password_hash: string; must_change_password?: boolean }[];

  if (passwordRows.length > 0) {
    const { password_hash, must_change_password } = passwordRows[0];
    await sql`
      INSERT INTO user_passwords (email, password_hash, updated_at, must_change_password)
      VALUES (${to}, ${password_hash}, NOW(), ${must_change_password ?? false})
      ON CONFLICT (email) DO UPDATE
      SET password_hash = ${password_hash}, updated_at = NOW(), must_change_password = ${must_change_password ?? false}
    `;
    await sql`DELETE FROM user_passwords WHERE email = ${from}`;
  }

  return { ok: true };
}
