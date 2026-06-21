import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';

interface PublicRouteProps {
  children: ReactElement;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const accessToken = tokenStorage.getAccessToken();

  if (isAuthenticated || accessToken) {
    return <Navigate to={role === 'super_admin' ? '/super-admin' : '/'} replace />;
  }

  return children;
};

export default PublicRoute;
