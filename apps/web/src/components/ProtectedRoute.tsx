import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, usePermissions } from '../hooks/storeHooks';
import { isApiEnabled } from '../services/api/config';
import { getHomeRouteForRole, isEmployeeRole } from '../utils/routing';
import { PageLoader } from './Loader';
import type { Permission } from '../types';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const bootstrapReady = useAppSelector((s) => s.ui.bootstrapReady);
  const role = useAppSelector((s) => s.auth.user?.role);
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isApiEnabled() && !bootstrapReady && !isEmployeeRole(role)) {
    return (
      <PageLoader
        message="Loading your workspace…"
        hint="Syncing assets, people, and recent activity for your organization."
      />
    );
  }
  return <>{children}</>;
}

export function ModuleRoute({ children, module }: { children: React.ReactNode; module: Permission }) {
  const { can } = usePermissions();
  if (!can(module)) {
    // Redirect to home if they don't have access to this module
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);
  const location = useLocation();
  
  if (isAuthenticated) {
    const from = location.state?.from || getHomeRouteForRole(role);
    return <Navigate to={from} replace />;
  }
  return <>{children}</>;
}

/** Unknown routes: login when signed out, portal home when signed in. */
export function AuthRedirect() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.user?.role);
  return <Navigate to={isAuthenticated ? getHomeRouteForRole(role) : '/login'} replace />;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (isEmployeeRole(role)) return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

export function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (!isEmployeeRole(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function SystemAdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (role !== 'platform_admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
