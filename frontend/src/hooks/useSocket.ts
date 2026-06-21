import { useEffect, useMemo } from 'react';
import { io, type Socket } from 'socket.io-client';

import { baseURL } from '../api/axiosInstance';
import { useAuthStore } from '../store/authStore';
import { tokenStorage } from '../utils/tokenStorage';

const socketCache = new Map<string, Socket>();

const socketBaseUrl = (process.env.REACT_APP_SOCKET_URL || baseURL).replace(
  /\/api\/?$/,
  ''
);

export const getSocketClient = (namespace: string, token: string) => {
  const cacheKey = `${namespace}:${token}`;
  if (!socketCache.has(cacheKey)) {
    const socket = io(`${socketBaseUrl}${namespace}`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      query: { token },
    });
    socketCache.set(cacheKey, socket);
  }

  return socketCache.get(cacheKey)!;
};

export const useSocket = (namespace: string) => {
  const token = useAuthStore((state) => state.token) || tokenStorage.getAccessToken();

  const socket = useMemo(() => {
    if (!token) {
      return null;
    }

    return getSocketClient(namespace, token);
  }, [namespace, token]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        socket.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [socket]);

  return socket;
};
