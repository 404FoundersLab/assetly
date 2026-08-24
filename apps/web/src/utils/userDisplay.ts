import type { User, UserRole } from '../types';
import { ROLE_LABELS } from '../constants/roles';

export function getUserDisplayName(user: Pick<User, 'firstName' | 'lastName'> | null | undefined): string {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function getUserInitials(user: Pick<User, 'firstName' | 'lastName'> | null | undefined): string {
  if (!user) return '?';
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first.length >= 2) return first.slice(0, 2).toUpperCase();
  return first[0]?.toUpperCase() ?? '?';
}

export function getRoleLabel(role: UserRole | undefined): string {
  if (!role) return '';
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}
