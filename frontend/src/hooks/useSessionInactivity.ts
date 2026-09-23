import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const activityEvents: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
];

const useSessionInactivity = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return undefined;
    }

    const clearTimer = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };

    const startTimer = () => {
      clearTimer();
      timeoutRef.current = window.setTimeout(() => {
        logout();
        toast('You were logged out after 5 minutes of inactivity.');
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      startTimer();
    };

    startTimer();
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true })
    );

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity)
      );
    };
  }, [isAuthenticated, logout]);
};

export default useSessionInactivity;
