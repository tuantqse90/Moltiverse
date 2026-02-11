'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ToastProvider } from '@/components/Toast'
import { ErrorBoundary, OfflineIndicator } from '@/components/ErrorBoundary'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { Footer } from '@/components/Footer'
import { ConsentPopup } from '@/components/ConsentPopup'

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
  const pathname = usePathname()
  const isBarePage = pathname === '/skill'

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <NetworkStatusWrapper>
            {isBarePage ? (
              children
            ) : (
              <>
                <div className="flex flex-col min-h-screen">
                  <div className="flex-1">
                    {children}
                  </div>
                  <Footer />
                </div>
                <ConsentPopup />
              </>
            )}
          </NetworkStatusWrapper>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  )
}
