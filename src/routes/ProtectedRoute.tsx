import { Navigate, Outlet } from 'react-router';
import { useAuthStore, homeForRole } from '../store/authStore';
import type { UserRole } from '../types';

interface Props {
  /** Roles allowed through. Omit to allow any authenticated user. */
  roles?: UserRole[];
}

export default function ProtectedRoute({ roles }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}
