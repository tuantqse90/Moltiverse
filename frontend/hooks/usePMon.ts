'use client'

import { useState, useEffect, useCallback } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export interface TierInfo {
  name: string
  emoji: string
  color: string
  nextTier?: string
  nextThreshold?: number
}

export interface PMonBreakdown {
  owner: {
    balance: number
    totalEarned: number
  }
  agent: {
    address: string
    balance: number
    totalEarned: number
  } | null
}

export interface PMonBalance {
  walletAddress: string
  balance: number
  totalEarned: number
  totalSpent: number
  tier: string
  tierInfo: TierInfo
  progress: {
    current: number
    next: number
    percentage: string
  } | null
  breakdown?: PMonBreakdown
  streakDays: number
  lastActiveAt: string | null
  lastDailyClaimAt: string | null
}

export interface PMonTransaction {
  id: number
  walletAddress: string
  amount: number
  action: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
  source?: 'owner' | 'agent'
}

export interface LeaderboardEntry {
  rank: number
  walletAddress: string
  balance: number
  totalEarned: number
  tier: string
  tierInfo: TierInfo
  profile: {
    name: string | null
    avatarUrl: string | null
    isAgent: boolean
    nftAvatarSeed?: number | null
  } | null
}

export function usePMon(walletAddress: string | undefined) {
  const [balance, setBalance] = useState<PMonBalance | null>(null)
  const [history, setHistory] = useState<PMonTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/pmon/balance/${walletAddress}`)
      const data = await response.json()

      if (data.success) {
        setBalance(data.data)
      } else {
        setError(data.error || 'Failed to fetch pMON balance')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching pMON balance:', err)
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  const fetchHistory = useCallback(async (limit: number = 50) => {
    if (!walletAddress) {
      setHistory([])
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/pmon/history/${walletAddress}?limit=${limit}`)
      const data = await response.json()

      if (data.success) {
        setHistory(data.data)
      }
    } catch (err) {
      console.error('Error fetching pMON history:', err)
    }
  }, [walletAddress])

  const claimDaily = useCallback(async (): Promise<{ success: boolean; points?: number; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: 'No wallet connected' }
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/pmon/claim-daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchBalance() // Refresh balance
        return { success: true, points: data.data.points }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error claiming daily bonus:', err)
      return { success: false, error: 'Failed to connect to server' }
    }
  }, [walletAddress, fetchBalance])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  return {
    balance,
    history,
    loading,
    error,
    fetchBalance,
    fetchHistory,
    claimDaily,
  }
}

export function useLeaderboard(limit: number = 20, autoRefresh: boolean = true) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchLeaderboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/pmon/leaderboard?limit=${limit}`)
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data.data)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch leaderboard')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchLeaderboard(false) // Don't show loading spinner on auto-refresh
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchLeaderboard])

  return {
    leaderboard,
    loading,
    error,
    lastUpdated,
    fetchLeaderboard,
  }
}
