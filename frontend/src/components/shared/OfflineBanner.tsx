import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
      You're offline - showing cached data.
    </div>
  );
};

export default OfflineBanner;
