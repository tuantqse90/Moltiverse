'use client'

import { useEffect } from 'react'

/**
 * Suppresses unhandled errors thrown by broken wallet extensions.
 *
 * MetaMask's inpage.js (content script) runs on EVERY page automatically.
 * When the MetaMask extension is disabled, crashed, or its service worker
 * is dead, inpage.js throws unhandled promise rejections like:
 *   "Failed to connect to MetaMask"
 *   "MetaMask extension not found"
 *
 * These errors happen OUTSIDE our React code — we cannot catch them with
 * try/catch. They can crash React Error Boundaries and break the entire app.
 *
 * This component installs a global handler that silently swallows these
 * wallet-specific errors so the app continues to work normally.
 * The user will see a friendly message when they try to connect instead.
 */
export function WalletErrorSuppressor() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || '')
      if (isWalletError(msg)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    const errorHandler = (event: ErrorEvent) => {
      const msg = String(event.message || event.error?.message || '')
      if (isWalletError(msg)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    window.addEventListener('unhandledrejection', handler, true)
    window.addEventListener('error', errorHandler, true)

    return () => {
      window.removeEventListener('unhandledrejection', handler, true)
      window.removeEventListener('error', errorHandler, true)
    }
  }, [])

  return null
}

function isWalletError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    lower.includes('metamask') ||
    lower.includes('extension not found') ||
    lower.includes('inpage') ||
    lower.includes('failed to connect to') ||
    lower.includes('provider not available') ||
    lower.includes('ethereum.request') ||
    lower.includes('already processing eth_requestaccounts')
  )
}
