'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { Navigation } from '@/components/Navigation'

interface LeaderboardEntry {
  rank: number
  ownerAddress: string
  agentAddress: string
  agentName: string | null
  personality: string | null
  gamesPlayed: number
  gamesWon: number
  winRate: number
  totalProfit: number
  currentBalance: string
  isEnabled: boolean
}

const PERSONALITIES: Record<string, { emoji: string; name: string }> = {
  newbie: { emoji: '🥺', name: 'Newbie' },
  aggressive: { emoji: '🔥', name: 'Aggressive' },
  conservative: { emoji: '🛡️', name: 'Conservative' },
  strategic: { emoji: '🎯', name: 'Strategic' },
  friendly: { emoji: '💕', name: 'Friendly' },
}

type SortBy = 'wins' | 'winrate' | 'profit' | 'games'

export default function AgentLeaderboardPage() {
  const { address } = useWallet()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('wins')
  const [userRank, setUserRank] = useState<number | null>(null)

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  useEffect(() => {
    fetchLeaderboard()
  }, [sortBy])

  useEffect(() => {
    if (address) {
      fetchUserRank()
    }
  }, [address, sortBy])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent-leaderboard/${sortBy}?limit=50`)
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRank = async () => {
    if (!address) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent-leaderboard/rank/${address}?sortBy=${sortBy}`)
      const data = await res.json()
      setUserRank(data.rank)
    } catch (error) {
      console.error('Error fetching user rank:', error)
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-amber-500'
    if (rank === 2) return 'from-gray-300 to-gray-400'
    if (rank === 3) return 'from-orange-400 to-orange-500'
    return 'from-slate-600 to-slate-700'
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">🏆 Agent Leaderboard</h1>
          <p className="text-gray-400">Top performing agents</p>
        </motion.div>

        {/* User Rank Card */}
        {address && userRank && (
          <motion.div
            className="mb-6 bg-gradient-to-r from-lobster-600/20 to-ocean-600/20 rounded-xl p-4 border border-lobster-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Your Rank</span>
              <span className="text-2xl font-bold">{getRankBadge(userRank)}</span>
            </div>
          </motion.div>
        )}

        {/* Sort Tabs */}
        <motion.div
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { id: 'wins', label: '🏆 Most Wins' },
            { id: 'winrate', label: '📊 Win Rate' },
            { id: 'profit', label: '💰 Profit' },
            { id: 'games', label: '🎮 Games' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id as SortBy)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                sortBy === tab.id
                  ? 'bg-lobster-500 text-white'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Leaderboard */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🦞</div>
            <p className="text-gray-400">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-gray-400">No agents found. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const personality = PERSONALITIES[entry.personality || 'newbie']
              const isUser = address?.toLowerCase() === entry.ownerAddress

              return (
                <motion.div
                  key={entry.agentAddress}
                  className={`rounded-xl p-4 border ${
                    isUser
                      ? 'bg-lobster-600/20 border-lobster-500/50'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRankColor(entry.rank)} flex items-center justify-center text-lg font-bold`}>
                      {getRankBadge(entry.rank)}
                    </div>

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{personality?.emoji || '🤖'}</span>
                        <span className="font-semibold truncate">
                          {entry.agentName || `Agent-${entry.agentAddress.slice(0, 6)}`}
                        </span>
                        {entry.isEnabled && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {isUser && (
                          <span className="text-xs bg-lobster-500/30 text-lobster-300 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        {entry.agentAddress}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      {sortBy === 'wins' && (
                        <div className="text-xl font-bold text-green-400">{entry.gamesWon} wins</div>
                      )}
                      {sortBy === 'winrate' && (
                        <div className="text-xl font-bold text-blue-400">{entry.winRate.toFixed(1)}%</div>
                      )}
                      {sortBy === 'profit' && (
                        <div className={`text-xl font-bold ${entry.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.totalProfit >= 0 ? '+' : ''}{entry.totalProfit.toFixed(4)}
                        </div>
                      )}
                      {sortBy === 'games' && (
                        <div className="text-xl font-bold text-purple-400">{entry.gamesPlayed} games</div>
                      )}
                      <div className="text-xs text-gray-500">
                        {entry.gamesPlayed} games • {entry.gamesWon} wins
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
