import { useEffect } from 'react';

import { useUiStore } from '../store/uiStore';
import { useSocket } from './useSocket';

export const useNotifications = () => {
  const socket = useSocket('/notifications');
  const setNotificationBadgeCount = useUiStore((state) => state.setNotificationBadgeCount);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleBadgeUpdate = (payload: { unread?: number }) => {
      setNotificationBadgeCount(payload.unread || 0);
    };

    socket.on('notification:badge_update', handleBadgeUpdate);

    return () => {
      socket.off('notification:badge_update', handleBadgeUpdate);
    };
  }, [setNotificationBadgeCount, socket]);

  return socket;
};
