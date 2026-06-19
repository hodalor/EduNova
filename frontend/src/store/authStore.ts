import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser, UserRole } from '../types/auth';
import { tokenStorage } from '../utils/tokenStorage';

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  setSession: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      setSession: ({ user, accessToken, refreshToken }) => {
        tokenStorage.setTokens(accessToken, refreshToken);
        set({ user, role: user.role, isAuthenticated: true });
      },
      logout: () => {
        tokenStorage.clearTokens();
        set({ user: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: 'eduova-auth-store',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
