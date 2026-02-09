'use client'

import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType: string | null
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isSlowConnection: false,
    connectionType: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection

      setStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection?.effectiveType === 'slow-2g' ||
                         connection?.effectiveType === '2g',
        connectionType: connection?.effectiveType || null,
      })
    }

    updateNetworkStatus()

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  return status
}

// Hook for handling API errors with retry logic
interface UseRetryOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: Error) => void
}

interface UseRetryResult<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  retryCount: number
  retry: () => void
}

export function useRetry<T>(
  fetchFn: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryResult<T> {
  const { maxRetries = 3, retryDelay = 1000, onError } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  const execute = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchFn()
      setData(result)
      setRetryCount(0)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)

      // Auto-retry if under max retries
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1)
        }, retryDelay * (retryCount + 1))
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, retryCount, maxRetries, retryDelay, onError])

  useEffect(() => {
    execute()
  }, [retryCount])

  const retry = useCallback(() => {
    setRetryCount(0)
    execute()
  }, [execute])

  return { data, error, isLoading, retryCount, retry }
}

// Hook for API request with better error handling
interface FetchState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

export function useFetch<T>(url: string, options?: RequestInit): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: true,
  })

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json = await response.json()

      if (json.success === false) {
        throw new Error(json.error || json.message || 'Request failed')
      }

      setState({
        data: json.data ?? json,
        error: null,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setState({
        data: null,
        error: message,
        isLoading: false,
      })
    }
  }, [url, options])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refetch: fetchData }
}
