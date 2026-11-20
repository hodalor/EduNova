import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';
import { resolveApiBaseUrl } from './apiOrigin';

const baseURL = resolveApiBaseUrl();

const authApi = axios.create({
  baseURL,
  withCredentials: true,
});

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

const collectValidationMessages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectValidationMessages);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const item = value as Record<string, unknown>;
  const messages: string[] = [];

  if (typeof item.message === 'string' && item.message.trim()) {
    messages.push(item.message.trim());
  }

  if (typeof item.msg === 'string' && item.msg.trim()) {
    messages.push(item.msg.trim());
  }

  if (typeof item.path === 'string' && typeof item.message === 'string' && item.message.trim()) {
    messages.push(`${item.path}: ${item.message.trim()}`);
  }

  return messages;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | {
          message?: string;
          error?: string;
          errors?: unknown;
        }
      | undefined;

    if (payload?.message && String(payload.message).trim()) {
      return String(payload.message).trim();
    }

    if (payload?.error && String(payload.error).trim()) {
      return String(payload.error).trim();
    }

    const validationMessages = collectValidationMessages(payload?.errors);
    if (validationMessages.length) {
      return validationMessages.join(' | ');
    }

    if (!error.response) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
};

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = tokenStorage.getAccessToken();
  const { institution, tenantContext, role } = useAuthStore.getState();
  const institutionId =
    role === 'super_admin' ? tenantContext?.id : tenantContext?.id || institution?.id;

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (institutionId) {
    config.headers.set('x-institution-id', institutionId);
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await authApi.post('/auth/refresh', { refresh_token: refreshToken });
        const payload = data.data || data;
        const nextAccessToken = payload.tokens?.access_token || payload.access_token;
        const nextRefreshToken =
          payload.tokens?.refresh_token || payload.refresh_token || refreshToken;

        tokenStorage.setTokens(nextAccessToken, nextRefreshToken);
        useAuthStore.getState().updateAccessToken(
          nextAccessToken,
          nextRefreshToken,
          payload.permissions,
          payload.user || null
        );

        if (originalRequest.headers) {
          originalRequest.headers.set('Authorization', `Bearer ${nextAccessToken}`);
        }

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (!error.response) {
      toast.error(getApiErrorMessage(error));
    }

    return Promise.reject(error);
  }
);

export { baseURL, authApi };
export default axiosInstance;
