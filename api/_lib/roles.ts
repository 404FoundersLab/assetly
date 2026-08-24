import type { AuthUser } from './auth';
import { error } from './db';

export const PLATFORM_ADMIN_ROLE = 'platform_admin';
export const TENANT_ADMIN_ROLE = 'tenant_admin';

export const ALL_ROLES = [
  'platform_admin',
  'tenant_admin',
  'it_admin',
  'hr_admin',
  'finance_admin',
  'viewer',
  'employee',
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

/** Roles a tenant admin may assign within their organization. */
export const TENANT_ASSIGNABLE_ROLES: AppRole[] = [
  'tenant_admin',
  'it_admin',
  'hr_admin',
  'finance_admin',
  'viewer',
  'employee',
];

/** Roles only platform admin may assign. */
export const PLATFORM_ONLY_ROLES: AppRole[] = ['platform_admin'];

export function canManageUsers(role: string): boolean {
  return role === PLATFORM_ADMIN_ROLE || role === TENANT_ADMIN_ROLE;
}

export function rolesAssignableBy(actorRole: string): AppRole[] {
  if (actorRole === PLATFORM_ADMIN_ROLE) {
    return [...PLATFORM_ONLY_ROLES, ...TENANT_ASSIGNABLE_ROLES];
  }
  if (actorRole === TENANT_ADMIN_ROLE) {
    return [...TENANT_ASSIGNABLE_ROLES];
  }
  return [];
}

export function isRoleAllowedForActor(actorRole: string, targetRole: string): boolean {
  return rolesAssignableBy(actorRole).includes(targetRole as AppRole);
}

export function assertTenantAccess(
  auth: AuthUser,
  targetTenantId: string,
): Response | null {
  if (auth.role === PLATFORM_ADMIN_ROLE) return null;
  if (!auth.tenantId || auth.tenantId !== targetTenantId) {
    return error('Forbidden — user is outside your organization', 403);
  }
  return null;
}

export async function getUserTenantId(
  sql: { (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown> },
  userId: string,
): Promise<string | null> {
  const rows = (await sql`SELECT tenant_id FROM users WHERE id = ${userId}`) as { tenant_id: string }[];
  return rows[0]?.tenant_id ?? null;
}
