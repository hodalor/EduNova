import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import OfflineBanner from './components/shared/OfflineBanner';
import { useNotifications } from './hooks/useNotifications';
import AppRouter from './routes/AppRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

const AppContent = () => {
  useNotifications();

  return (
    <>
      <OfflineBanner />
      <AppRouter />
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '16px',
            border: '1px solid #D9E1F2',
            color: '#10213f',
          },
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
