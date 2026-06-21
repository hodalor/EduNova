import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser, InstitutionSummary, LoginResponse, UserRole } from '../types/auth';
import { tokenStorage } from '../utils/tokenStorage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  institution: InstitutionSummary | null;
  permissions: string[];
  role: UserRole | null;
  isAuthenticated: boolean;
  setSession: (payload: LoginResponse) => void;
  updateAccessToken: (token: string, refreshToken?: string) => void;
  logout: () => void;
}

const normalizeRole = (role: string | null | undefined): UserRole | null => {
  if (!role) {
    return null;
  }
  return role === 'admin' ? 'institution_admin' : (role as UserRole);
};

const normalizeUser = (user: AuthUser | null): AuthUser | null => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: normalizeRole(user.role) || 'institution_admin',
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: tokenStorage.getAccessToken(),
      refreshToken: tokenStorage.getRefreshToken(),
      institution: null,
      permissions: [],
      role: null,
      isAuthenticated: Boolean(tokenStorage.getAccessToken()),
      setSession: (payload) => {
        tokenStorage.setTokens(payload.tokens.access_token, payload.tokens.refresh_token);
        const normalizedUser = normalizeUser(payload.user);
        set({
          user: normalizedUser,
          token: payload.tokens.access_token,
          refreshToken: payload.tokens.refresh_token,
          institution: payload.institution,
          permissions: payload.permissions,
          role: normalizeRole(payload.user.role),
          isAuthenticated: true,
        });
      },
      updateAccessToken: (token, refreshToken) => {
        tokenStorage.setTokens(token, refreshToken || tokenStorage.getRefreshToken() || '');
        set((state) => ({
          token,
          refreshToken: refreshToken || state.refreshToken,
          isAuthenticated: true,
        }));
      },
      logout: () => {
        tokenStorage.clearTokens();
        set({
          user: null,
          token: null,
          refreshToken: null,
          institution: null,
          permissions: [],
          role: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'eduova-auth-store',
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<AuthState>;
        return {
          ...currentState,
          ...state,
          user: normalizeUser(state.user || null),
          role: normalizeRole(state.role),
        };
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        institution: state.institution,
        permissions: state.permissions,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
