import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';

interface ProtectedRouteProps {
  children: ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = tokenStorage.getAccessToken();

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
