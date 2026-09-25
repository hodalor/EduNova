import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: ReactElement;
  allowedRoles?: UserRole[];
  allowedPermissions?: string[];
}

const ProtectedRoute = ({ children, allowedRoles, allowedPermissions }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const accessToken = tokenStorage.getAccessToken();

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/login" replace />;
  }
  if (role === 'super_admin') {
    return children;
  }
  if (allowedRoles?.length && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  if (
    allowedPermissions?.length &&
    !allowedPermissions.some((permission) => permissions.includes(permission) || permissions.includes('*:*'))
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
