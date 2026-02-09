'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ToastProvider } from '@/components/Toast'
import { ErrorBoundary, OfflineIndicator } from '@/components/ErrorBoundary'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// Network status wrapper to show offline indicator
function NetworkStatusWrapper({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus()

  return (
    <>
      {children}
      <AnimatePresence>
        {!isOnline && <OfflineIndicator />}
      </AnimatePresence>
    </>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <NetworkStatusWrapper>
            {children}
          </NetworkStatusWrapper>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  )
}
