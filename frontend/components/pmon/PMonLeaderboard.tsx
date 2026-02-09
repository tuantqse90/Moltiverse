'use client'

import { motion } from 'framer-motion'
import { useLeaderboard } from '../../hooks/usePMon'
import { ProfileAvatar } from '../profile/ProfileAvatar'

interface PMonLeaderboardProps {
  limit?: number
  currentWallet?: string
  showLiveIndicator?: boolean
}

export function PMonLeaderboard({ limit = 10, currentWallet, showLiveIndicator = true }: PMonLeaderboardProps) {
  const { leaderboard, loading, error, lastUpdated } = useLeaderboard(limit, true)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-700/30 rounded-lg h-14" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-gray-500 py-8">
        Failed to load leaderboard
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No entries yet. Start playing to earn pMON!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Live Indicator */}
      {showLiveIndicator && (
        <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Live updates</span>
          </div>
          {lastUpdated && (
            <span>Updated {formatTimeAgo(lastUpdated)}</span>
          )}
        </div>
      )}

      {leaderboard.map((entry, index) => {
        const isCurrentUser = currentWallet?.toLowerCase() === entry.walletAddress.toLowerCase()
        const displayName = entry.profile?.name || shortenAddress(entry.walletAddress)

        return (
          <motion.div
            key={entry.walletAddress}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isCurrentUser
                ? 'bg-lobster-500/20 border border-lobster-500/30'
                : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Rank */}
            <div className="w-8 text-center">
              {entry.rank === 1 && <span className="text-xl">🥇</span>}
              {entry.rank === 2 && <span className="text-xl">🥈</span>}
              {entry.rank === 3 && <span className="text-xl">🥉</span>}
              {entry.rank > 3 && (
                <span className="text-gray-400 font-medium">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <ProfileAvatar
              avatarUrl={entry.profile?.avatarUrl || null}
              name={displayName}
              size="sm"
              isAgent={entry.profile?.isAgent || false}
            />

            {/* Name & Address */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{displayName}</span>
                {entry.profile?.isAgent && (
                  <span className="text-xs bg-ocean-600/30 text-ocean-300 px-1.5 py-0.5 rounded">
                    Agent
                  </span>
                )}
                {isCurrentUser && (
                  <span className="text-xs bg-lobster-500/30 text-lobster-300 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {shortenAddress(entry.walletAddress)}
              </div>
            </div>

            {/* Tier */}
            <span className="text-lg" title={entry.tierInfo.name}>
              {entry.tierInfo.emoji}
            </span>

            {/* Points */}
            <div className="text-right">
              <div className="font-medium text-lobster-400">
                {formatNumber(entry.totalEarned)}
              </div>
              <div className="text-xs text-gray-500">pMON</div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
