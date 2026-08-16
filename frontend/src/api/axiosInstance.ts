import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const authApi = axios.create({
  baseURL,
  withCredentials: true,
});

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

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
      // #region debug-point A:frontend-refresh-start
      fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'login-refresh-500',
          runId: 'pre-fix',
          hypothesisId: 'A',
          location: 'frontend/src/api/axiosInstance.ts:refresh-start',
          msg: '[DEBUG] frontend refresh start',
          data: {
            failedStatus: error.response?.status || null,
            failedUrl: originalRequest.url || null,
            hasRefreshToken: Boolean(refreshToken),
            hasAccessToken: Boolean(tokenStorage.getAccessToken()),
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
        // #region debug-point D:frontend-refresh-success
        fetch('http://127.0.0.1:7777/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'login-refresh-500',
            runId: 'pre-fix',
            hypothesisId: 'D',
            location: 'frontend/src/api/axiosInstance.ts:refresh-success',
            msg: '[DEBUG] frontend refresh success',
            data: {
              refreshUrl: '/auth/refresh',
              hasNextAccessToken: Boolean(nextAccessToken),
              hasNextRefreshToken: Boolean(nextRefreshToken),
            },
            ts: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        tokenStorage.setTokens(nextAccessToken, nextRefreshToken);
        useAuthStore.getState().updateAccessToken(nextAccessToken, nextRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.set('Authorization', `Bearer ${nextAccessToken}`);
        }

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        const axiosRefreshError = refreshError as AxiosError;
        // #region debug-point E:frontend-refresh-error
        fetch('http://127.0.0.1:7777/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'login-refresh-500',
            runId: 'pre-fix',
            hypothesisId: 'E',
            location: 'frontend/src/api/axiosInstance.ts:refresh-error',
            msg: '[DEBUG] frontend refresh error',
            data: {
              status: axiosRefreshError.response?.status || null,
              message: axiosRefreshError.message,
              refreshUrl: '/auth/refresh',
            },
            ts: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if ((error.response?.status || 0) >= 500) {
      toast.error('A server error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

export { baseURL, authApi };
export default axiosInstance;
