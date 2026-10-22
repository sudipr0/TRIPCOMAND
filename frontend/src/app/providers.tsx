import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { RouterProvider } from 'react-router-dom';

import { queryClient } from '@/lib/query-client';
import { router } from '@/app/router';

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="bottom-right"
        duration={4000}
        toastOptions={{
          className: 'border border-[hsl(30_10%_24%)] bg-bg-inverse text-accent-fg shadow-md',
        }}
      />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
