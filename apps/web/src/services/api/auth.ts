import type { Tenant, User } from '../../types';
import { apiFetch } from './client';

export interface LoginResponse {
  token: string;
  user: User;
  tenant: Tenant;
  requirePasswordSetup?: boolean;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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
