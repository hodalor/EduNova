import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import AppRouter from './routes/AppRouter';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
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
