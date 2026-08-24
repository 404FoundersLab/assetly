import type { UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Assetly Admin',
  tenant_admin: 'Tenant Admin',
  it_admin: 'IT Admin',
  hr_admin: 'HR Admin',
  finance_admin: 'Finance Admin',
  viewer: 'Viewer',
  employee: 'Employee',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  platform_admin: 'Full platform access — all tenants, organizations, and modules',
  tenant_admin: 'Full access within this organization; can create IT, HR, and employee accounts',
  it_admin: 'Assets, devices, requests, and IT operations for this tenant',
  hr_admin: 'HR module, employees, leave, attendance, and policies',
  finance_admin: 'IT Spend, vendors, and finance workflows',
  viewer: 'Read-only access to assets and audit data',
  employee: 'Employee portal — device requests and own records',
};

/** Roles tenant admins can provision (multiple accounts per role allowed). */
export const TENANT_ASSIGNABLE_ROLES: UserRole[] = [
  'tenant_admin',
  'it_admin',
  'hr_admin',
  'finance_admin',
  'viewer',
  'employee',
];

export const PLATFORM_ASSIGNABLE_ROLES: UserRole[] = [
  'platform_admin',
  ...TENANT_ASSIGNABLE_ROLES,
];

export function assignableRolesFor(actorRole: UserRole | undefined): UserRole[] {
  if (actorRole === 'platform_admin') return PLATFORM_ASSIGNABLE_ROLES;
  if (actorRole === 'tenant_admin') return TENANT_ASSIGNABLE_ROLES;
  return [];
}
