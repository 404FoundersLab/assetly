import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import type { Permission } from '../types';
import { PERMISSIONS } from '../types';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function usePermissions() {
  const role = useAppSelector((s) => s.auth.user?.role);

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    if (role === 'platform_admin') return true;
    return (PERMISSIONS[permission] as readonly string[]).includes(role);
  };

  return { can, role };
}

export function useAuthUser() {
  return useAppSelector((s) => s.auth.user);
}

export function useTenant() {
  return useAppSelector((s) => s.auth.tenant);
}
