import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: ReactElement;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const accessToken = tokenStorage.getAccessToken();

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles?.length && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'super_admin' ? '/super-admin' : '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
