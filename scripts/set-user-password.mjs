import { webcrypto } from 'node:crypto';
import pg from 'pg';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2v1:';

export async function hashPassword(pw) {
  const saltBytes = webcrypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS }, keyMaterial, 256);
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${PBKDF2_PREFIX}${saltHex}:${hashHex}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Assetly User & Password Helper

Usage:
  1. Generate PBKDF2 hash only:
     node scripts/set-user-password.mjs --hash <password>

  2. Insert or update password directly in database:
     DATABASE_URL=postgresql://... node scripts/set-user-password.mjs <email> <password> [role] [tenant_id]

Examples:
  node scripts/set-user-password.mjs --hash "MySecret@123"
  node scripts/set-user-password.mjs user@example.com "MySecret@123" tenant_admin 11111111-1111-1111-1111-111111111111
`);
    return;
  }

  if (args[0] === '--hash' && args[1]) {
    const hash = await hashPassword(args[1]);
    console.log('\n--- Generated PBKDF2 Hash ---');
    console.log(hash);
    console.log('\nSQL Insert Statement:');
    console.log(`INSERT INTO user_passwords (email, password_hash, updated_at) VALUES ('user@example.com', '${hash}', NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();\n`);
    return;
  }

  const email = args[0].toLowerCase().trim();
  const password = args[1];
  const role = args[2] || 'tenant_admin';
  const tenantId = args[3] || '11111111-1111-1111-1111-111111111111';

  if (!email || !password) {
    console.error('Error: email and password are required.');
    process.exit(1);
  }

  const hash = await hashPassword(password);
  console.log(`Password hash generated: ${hash}`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('\nDATABASE_URL is not set. Here is the SQL to run manually:');
    console.log(`
-- 1. Ensure user exists:
INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
VALUES (gen_random_uuid(), '${tenantId}', '${email}', 'User', 'Admin', '${role}')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;

-- 2. Set password:
INSERT INTO user_passwords (email, password_hash, updated_at)
VALUES ('${email}', '${hash}', NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
`);
    return;
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`
      INSERT INTO users (id, tenant_id, email, first_name, last_name, role)
      VALUES (gen_random_uuid(), $1, $2, 'User', 'Admin', $3)
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;
    `, [tenantId, email, role]);

    await client.query(`
      INSERT INTO user_passwords (email, password_hash, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
    `, [email, hash]);

    console.log(`\n Successfully updated user "${email}" with role "${role}" and updated password!`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
