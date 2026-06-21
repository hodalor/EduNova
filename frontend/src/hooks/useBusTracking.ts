import { useEffect, useState } from 'react';

import { useSocket } from './useSocket';

export interface BusLocationPayload {
  lat: number;
  lng: number;
  speed?: number;
  next_stop?: string;
  eta?: string;
}

export const useBusTracking = () => {
  const socket = useSocket('/transport');
  const [location, setLocation] = useState<BusLocationPayload | null>(null);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleLocation = (payload: BusLocationPayload) => {
      setLocation(payload);
    };

    socket.on('bus:location_update', handleLocation);

    return () => {
      socket.off('bus:location_update', handleLocation);
    };
  }, [socket]);

  return location;
};
