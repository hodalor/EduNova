import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

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

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
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
        const { data } = await authApi.post('/auth/refresh', { refreshToken });

        tokenStorage.setTokens(data.accessToken, data.refreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.set('Authorization', `Bearer ${data.accessToken}`);
        }

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
