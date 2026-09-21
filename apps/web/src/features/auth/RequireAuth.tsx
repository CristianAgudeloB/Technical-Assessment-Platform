import { Navigate, Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { type UserRole } from '../../api/auth';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <main className="auth-loading">Comprobando tu sesión…</main>;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/" replace />;
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === role) return <>{children}</>;
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/assessments'} replace />;
}
