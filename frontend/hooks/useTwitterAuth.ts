'use client'

import { useState, useEffect, useCallback } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export interface TwitterAuthStatus {
  configured: boolean
}

export interface TwitterUser {
  username: string
  displayName: string
  profileImageUrl: string
}

export function useTwitterAuth(walletAddress: string | undefined) {
  const [isConfigured, setIsConfigured] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<TwitterUser | null>(null)

  // Check if Twitter OAuth is configured
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/twitter/status`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsConfigured(data.data.configured)
        }
      })
      .catch(console.error)
  }, [])

  // Listen for OAuth popup callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin && event.origin !== BACKEND_URL) {
        return
      }

      const { type, user, error: authError } = event.data

      if (type === 'TWITTER_AUTH_SUCCESS' && user) {
        setAuthSuccess(user)
        setError(null)
        setLoading(false)
      } else if (type === 'TWITTER_AUTH_ERROR') {
        setError(authError || 'Authentication failed')
        setLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const startAuth = useCallback(async () => {
    if (!walletAddress || !isConfigured) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/twitter?wallet=${walletAddress}`)
      const data = await response.json()

      if (data.success && data.data?.authUrl) {
        // Open popup for OAuth
        const width = 600
        const height = 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        const popup = window.open(
          data.data.authUrl,
          'Twitter Login',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        )

        // Check if popup was blocked
        if (!popup || popup.closed) {
          setError('Popup was blocked. Please allow popups for this site.')
          setLoading(false)
          return
        }

        // Poll for popup close (as backup if postMessage fails)
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            setLoading(false)
          }
        }, 500)
      } else {
        setError(data.error || 'Failed to start authentication')
        setLoading(false)
      }
    } catch (err) {
      setError('Failed to connect to server')
      setLoading(false)
      console.error('Error starting Twitter auth:', err)
    }
  }, [walletAddress, isConfigured])

  const clearAuthSuccess = useCallback(() => {
    setAuthSuccess(null)
  }, [])

  return {
    isConfigured,
    loading,
    error,
    authSuccess,
    startAuth,
    clearAuthSuccess,
  }
}
