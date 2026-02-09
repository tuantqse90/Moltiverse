'use client'

import { useState, useEffect, useCallback } from 'react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export interface Profile {
  walletAddress: string
  name: string | null
  gender: string | null
  avatarUrl: string | null
  avatarSource: 'dicebear' | 'twitter'
  hobbies: string | null
  wealth: string | null
  twitterId: string | null
  twitterUsername: string | null
  twitterDisplayName: string | null
  twitterProfileImage: string | null
  isAgent: boolean
  agentName: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ProfileUpdateInput {
  name?: string
  gender?: string
  hobbies?: string
}

export function useProfile(walletAddress: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!walletAddress) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/profiles/${walletAddress}`)
      const data = await response.json()

      if (data.success) {
        setProfile(data.data)
      } else {
        setError(data.error || 'Failed to fetch profile')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  const updateProfile = useCallback(async (input: ProfileUpdateInput) => {
    if (!walletAddress) return null

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          ...input,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setProfile(data.data)
        return data.data
      } else {
        setError(data.error || 'Failed to update profile')
        return null
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error updating profile:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  const disconnectTwitter = useCallback(async () => {
    if (!walletAddress) return false

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/twitter/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchProfile() // Refresh profile
        return true
      } else {
        setError(data.error || 'Failed to disconnect Twitter')
        return false
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error disconnecting Twitter:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [walletAddress, fetchProfile])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    disconnectTwitter,
  }
}

export function useAvatarUrl(walletAddress: string | undefined): string {
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  useEffect(() => {
    if (!walletAddress) {
      setAvatarUrl('')
      return
    }

    // Generate DiceBear URL directly for fast display
    const seed = walletAddress.toLowerCase()
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&size=128`)

    // Then fetch actual avatar (might be Twitter)
    fetch(`${BACKEND_URL}/api/profiles/${walletAddress}/avatar`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.url) {
          setAvatarUrl(data.data.url)
        }
      })
      .catch(console.error)
  }, [walletAddress])

  return avatarUrl
}
