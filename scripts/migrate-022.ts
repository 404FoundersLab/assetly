import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function applyStatements(sql: ReturnType<typeof neon>, statements: string[]): Promise<void> {
  const [statement, ...remaining] = statements;
  if (!statement) return;
  await sql(statement);
  await applyStatements(sql, remaining);
}

async function applyToDatabases(databaseUrls: string[], statements: string[]): Promise<void> {
  const [databaseUrl, ...remaining] = databaseUrls;
  if (!databaseUrl) return;
  await applyStatements(neon(databaseUrl), statements);
  await applyToDatabases(remaining, statements);
}

const envStr = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
for (const line of envStr.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...value] = line.split('=');
    if (key && value.length) process.env[key.trim()] = value.join('=').trim();
  }
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const mainSql = neon(process.env.DATABASE_URL);
  const tenantDatabases = await mainSql`
    SELECT DISTINCT database_url FROM tenants WHERE database_url IS NOT NULL
  ` as { database_url: string }[];
  const databaseUrls = [...new Set([process.env.DATABASE_URL, ...tenantDatabases.map((tenant) => tenant.database_url)])];
  const migration = readFileSync(resolve(process.cwd(), 'database/supabase/022_product_opportunity_assignments.sql'), 'utf-8');
  const statements = migration.split(';').filter((statement) => statement.trim().length > 0);
  await applyToDatabases(databaseUrls, statements);
  console.log(`Migration 022 (product opportunity assignments) applied to ${databaseUrls.length} database(s)`);
}

try {
  await run();
} catch (err) {
  console.error(err);
  process.exit(1);
}