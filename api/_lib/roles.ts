import type { AuthUser } from './auth';
import { error } from './db';

export const PLATFORM_ADMIN_ROLE = 'platform_admin';
export const TENANT_ADMIN_ROLE = 'tenant_admin';

export const ALL_ROLES = [
  'platform_admin',
  'tenant_admin',
  'manager',
  'hr_admin',
  'it_admin',
  'finance_admin',
  'employee',
  'viewer',
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

/** Roles a tenant admin may assign within their organization. */
export const TENANT_ASSIGNABLE_ROLES: AppRole[] = [
  'tenant_admin',
  'manager',
  'hr_admin',
  'it_admin',
  'finance_admin',
  'employee',
  'viewer',
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

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'manage'
  | 'export';

export type PermissionResource =
  | 'assets'
  | 'employees'
  | 'leave'
  | 'departments'
  | 'vendors'
  | 'audit_logs'
  | 'billing'
  | 'users'
  | 'hierarchy'
  | 'workflows'
  | 'approvals'
  | 'requests'
  | 'finance';

const ROLE_PERMISSIONS: Record<AppRole, Partial<Record<PermissionResource, PermissionAction[]>>> = {
  platform_admin: {
    assets: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export'],
    employees: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export'],
    leave: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export'],
    departments: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    vendors: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    audit_logs: ['view', 'export'],
    billing: ['view', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    hierarchy: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    workflows: ['view', 'create', 'edit', 'delete', 'manage'],
    approvals: ['view', 'approve', 'reject', 'manage'],
    requests: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage'],
    finance: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  tenant_admin: {
    assets: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export'],
    employees: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export'],
    leave: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage', 'export'],
    departments: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    vendors: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    audit_logs: ['view', 'export'],
    billing: ['view', 'manage'],
    users: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    hierarchy: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    workflows: ['view', 'create', 'edit', 'delete', 'manage'],
    approvals: ['view', 'approve', 'reject', 'manage'],
    requests: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage'],
    finance: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
  },
  manager: {
    leave: ['view', 'approve', 'reject', 'export'],
    approvals: ['view', 'approve', 'reject'],
    requests: ['view', 'approve', 'reject', 'create'],
    employees: ['view', 'export'],
    hierarchy: ['view'],
    assets: ['view'],
  },
  hr_admin: {
    employees: ['view', 'create', 'edit', 'manage', 'export'],
    leave: ['view', 'create', 'edit', 'manage', 'export', 'approve', 'reject'],
    departments: ['view', 'create', 'edit', 'manage'],
    hierarchy: ['view', 'create', 'edit', 'manage', 'export'],
    audit_logs: ['view'],
    approvals: ['view', 'approve', 'reject'],
    requests: ['view', 'create'],
  },
  it_admin: {
    assets: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    requests: ['view', 'approve', 'reject', 'manage'],
    vendors: ['view', 'create', 'edit'],
    employees: ['view'],
    departments: ['view'],
    hierarchy: ['view'],
    audit_logs: ['view'],
    approvals: ['view', 'approve', 'reject'],
  },
  finance_admin: {
    finance: ['view', 'create', 'edit', 'manage', 'export'],
    vendors: ['view', 'create', 'edit'],
    assets: ['view'],
    approvals: ['view', 'approve', 'reject'],
    requests: ['view', 'approve', 'reject'],
    audit_logs: ['view'],
  },
  employee: {
    leave: ['view', 'create', 'edit'],
    requests: ['view', 'create'],
    approvals: ['view'],
    hierarchy: ['view'],
    assets: ['view'],
  },
  viewer: {
    assets: ['view'],
    audit_logs: ['view'],
    hierarchy: ['view'],
    departments: ['view'],
  },
};

export function hasPermission(
  role: string | undefined,
  action: PermissionAction,
  resource: PermissionResource,
): boolean {
  if (!role) return false;
  if (role === PLATFORM_ADMIN_ROLE) return true;
  const rolePerms = ROLE_PERMISSIONS[role as AppRole];
  if (!rolePerms) return false;
  const resourceActions = rolePerms[resource];
  if (!resourceActions) return false;
  return resourceActions.includes(action);
}

export function requirePermission(
  auth: AuthUser,
  action: PermissionAction,
  resource: PermissionResource,
): Response | null {
  if (auth.role === PLATFORM_ADMIN_ROLE) return null;
  if (!hasPermission(auth.role, action, resource)) {
    return error(`Forbidden — ${auth.role} does not have '${action}' permission on '${resource}'`, 403);
  }
  return null;
}
