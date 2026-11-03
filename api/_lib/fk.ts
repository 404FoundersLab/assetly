/** Foreign-key ownership checks: a referenced row must belong to the caller's tenant. */
const ALLOWED_TABLES = new Set(['employees', 'departments', 'vendors']);

export async function belongsToTenant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  table: 'employees' | 'departments' | 'vendors',
  id: string | null | undefined,
  tenantId: string,
): Promise<boolean> {
  if (!id) return true;
  if (!ALLOWED_TABLES.has(table)) return false;
  let rows: unknown[];
  if (table === 'employees') {
    rows = await sql`SELECT 1 FROM employees WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
  } else if (table === 'departments') {
    rows = await sql`SELECT 1 FROM departments WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
  } else {
    rows = await sql`SELECT 1 FROM vendors WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
  }
  return rows.length > 0;
}
