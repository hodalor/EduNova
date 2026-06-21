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
  const institutionId = useAuthStore.getState().institution?.id;

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
        useAuthStore.getState().updateAccessToken(nextAccessToken, nextRefreshToken);

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

    if ((error.response?.status || 0) >= 500) {
      toast.error('A server error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

export { baseURL, authApi };
export default axiosInstance;
