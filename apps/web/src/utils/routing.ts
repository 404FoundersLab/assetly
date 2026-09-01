import type { UserRole } from '../types';

export function isEmployeeRole(role: UserRole | undefined): boolean {
  return role === 'employee';
}

export function getHomeRouteForRole(role: UserRole | undefined): string {
  if (role === 'platform_admin') return '/system-admin/organizations';
  return isEmployeeRole(role) ? '/portal' : '/';
}
