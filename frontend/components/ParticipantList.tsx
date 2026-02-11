'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileAvatar } from './profile/ProfileAvatar'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface ParticipantProfile {
  walletAddress: string
  name: string | null
  avatarUrl: string | null
  isAgent: boolean
  agentType?: 'agent' | 'openclaw-agent' | null
  nftAvatarSeed?: number | null
}

interface ParticipantListProps {
  participants: string[]
  currentAddress?: string
}

export function ParticipantList({ participants, currentAddress }: ParticipantListProps) {
  const [profiles, setProfiles] = useState<Record<string, ParticipantProfile>>({})

  // Fetch profiles for participants
  useEffect(() => {
    const fetchProfiles = async () => {
      const newProfiles: Record<string, ParticipantProfile> = {}

      await Promise.all(
        participants.map(async (address) => {
          if (profiles[address.toLowerCase()]) {
            newProfiles[address.toLowerCase()] = profiles[address.toLowerCase()]
            return
          }

          try {
            const response = await fetch(`${BACKEND_URL}/api/profiles/${address}`)
            const data = await response.json()
            if (data.success && data.data) {
              newProfiles[address.toLowerCase()] = data.data
            }
          } catch (error) {
            // Use default avatar on error
            newProfiles[address.toLowerCase()] = {
              walletAddress: address.toLowerCase(),
              name: null,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${address.toLowerCase()}&size=64`,
              isAgent: false,
            }
          }
        })
      )

      setProfiles(newProfiles)
    }

    if (participants.length > 0) {
      fetchProfiles()
    }
  }, [participants])

  // Periodically refresh current user's profile for avatar changes
  useEffect(() => {
    if (!currentAddress) return

    const refreshOwnProfile = async () => {
      const addr = currentAddress.toLowerCase()
      try {
        const response = await fetch(`${BACKEND_URL}/api/profiles/${addr}`)
        const data = await response.json()
        if (data.success && data.data) {
          setProfiles(prev => {
            const existing = prev[addr]
            if (existing &&
                existing.avatarUrl === data.data.avatarUrl &&
                existing.nftAvatarSeed === data.data.nftAvatarSeed) {
              return prev
            }
            return { ...prev, [addr]: data.data }
          })
        }
      } catch { /* ignore */ }
    }

    // Refresh immediately on mount, then every 15s
    refreshOwnProfile()
    const interval = setInterval(refreshOwnProfile, 15000)
    return () => clearInterval(interval)
  }, [currentAddress])

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getDisplayName = (address: string): string => {
    const profile = profiles[address.toLowerCase()]
    return profile?.name || shortenAddress(address)
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span>🦞</span> Lobsters in the Pot
        <span className="text-sm text-gray-400 font-normal">({participants.length})</span>
      </h3>

      {participants.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          <p className="text-4xl mb-2">🫗</p>
          <p>The pot is empty... be the first lobster!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence>
            {participants.map((address, index) => (
              <motion.div
                key={address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  address.toLowerCase() === currentAddress?.toLowerCase()
                    ? 'bg-ocean-600/30 border border-ocean-500'
                    : 'bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ProfileAvatar
                    avatarUrl={profiles[address.toLowerCase()]?.avatarUrl || null}
                    name={profiles[address.toLowerCase()]?.name}
                    nftSeed={profiles[address.toLowerCase()]?.nftAvatarSeed}
                    size="sm"
                    isAgent={profiles[address.toLowerCase()]?.isAgent}
                    showBorder={false}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {getDisplayName(address)}
                    </span>
                    {profiles[address.toLowerCase()]?.name && (
                      <span className="text-xs text-gray-500 font-mono">
                        {shortenAddress(address)}
                      </span>
                    )}
                  </div>
                  {address.toLowerCase() === currentAddress?.toLowerCase() && (
                    <span className="text-xs bg-ocean-500 px-2 py-0.5 rounded-full">You</span>
                  )}
                  {profiles[address.toLowerCase()]?.isAgent && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      profiles[address.toLowerCase()]?.agentType === 'openclaw-agent'
                        ? 'bg-amber-600/30 text-amber-300'
                        : 'bg-ocean-600/30 text-ocean-300'
                    }`}>
                      {profiles[address.toLowerCase()]?.agentType === 'openclaw-agent' ? 'openclaw-agent' : 'Agent'}
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-sm">#{index + 1}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
