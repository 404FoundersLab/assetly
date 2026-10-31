import type { Tenant, User } from '../../types';
import { apiFetch } from './client';

export interface LoginResponse {
  token: string;
  user: User;
  tenant: Tenant;
  requirePasswordSetup?: boolean;
  mfaRequired?: boolean;
  mfaEnrollRequired?: boolean;
}

export async function apiLogin(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, ...(mfaCode ? { mfaCode } : {}) }),
  });
}

export async function getMfaStatus(): Promise<{ enabled: boolean; enforced: boolean }> {
  return apiFetch<{ enabled: boolean; enforced: boolean }>('/api/auth/mfa');
}

export async function setupMfa(): Promise<{ secret: string; otpauthUri: string }> {
  return apiFetch('/api/auth/mfa', { method: 'POST', body: JSON.stringify({ action: 'setup' }) });
}

/** Returns a full session token when enrollment was required at sign-in. */
export async function enableMfa(code: string): Promise<{ enabled: boolean; token?: string }> {
  return apiFetch('/api/auth/mfa', { method: 'POST', body: JSON.stringify({ action: 'enable', code }) });
}

export async function disableMfa(password: string, code: string): Promise<void> {
  await apiFetch('/api/auth/mfa', {
    method: 'POST',
    body: JSON.stringify({ action: 'disable', password, code }),
  });
}

export interface MfaAdminUser {
  email: string;
  name: string;
  role: string;
  enrolled: boolean;
  enforced: boolean;
}

export async function getTenantMfa(tenantId: string): Promise<{ tenantEnforced: boolean; users: MfaAdminUser[] }> {
  return apiFetch(`/api/auth/mfa-admin?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function adminMfaAction(
  body:
    | { action: 'setTenantEnforced'; tenantId: string; enforced: boolean }
    | { action: 'setUserEnforced'; email: string; enforced: boolean }
    | { action: 'resetUser'; email: string },
): Promise<void> {
  await apiFetch('/api/auth/mfa-admin', { method: 'POST', body: JSON.stringify(body) });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export const AUTH_TOKEN_KEY = 'assetly_token';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeToken(token: string | null) {
  if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  else sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
