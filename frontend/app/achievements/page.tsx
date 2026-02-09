'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { Navigation } from '@/components/Navigation'

interface Achievement {
  id: number
  achievementId: string
  name: string
  description: string | null
  emoji: string | null
  category: string | null
  requirement: number | null
  pmonReward: number | null
  rarity: string | null
  unlockedAt: string | null
  isUnlocked: boolean
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-orange-500',
}

const RARITY_GLOW: Record<string, string> = {
  common: '',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-yellow-500/40 shadow-lg',
}

const CATEGORY_LABELS: Record<string, string> = {
  wins: '🏆 Wins',
  games: '🎮 Games',
  streak: '🔥 Streak',
  special: '⭐ Special',
}

export default function AchievementsPage() {
  const { address, isConnected } = useWallet()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ unlocked: 0, total: 0, percent: 0 })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([])

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  useEffect(() => {
    if (address) {
      fetchAchievements()
      checkForNewUnlocks()
    } else {
      setLoading(false)
    }
  }, [address])

  const fetchAchievements = async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/achievements/${address}`)
      const data = await res.json()
      setAchievements(data.achievements || [])
      setProgress({
        unlocked: data.unlocked || 0,
        total: data.total || 0,
        percent: data.progress || 0,
      })
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkForNewUnlocks = async () => {
    if (!address) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/achievements/${address}/check`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
        setNewUnlocks(data.newlyUnlocked)
        // Refresh achievements after new unlocks
        fetchAchievements()
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
  }

  const categories = ['wins', 'games', 'streak', 'special']

  const filteredAchievements = selectedCategory
    ? achievements.filter((a) => a.category === selectedCategory)
    : achievements

  const groupedByCategory = categories.reduce((acc, cat) => {
    acc[cat] = achievements.filter((a) => a.category === cat)
    return acc
  }, {} as Record<string, Achievement[]>)

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
          <h1 className="text-3xl font-bold mb-2">🏅 Achievements</h1>
          <p className="text-gray-400">Unlock badges and earn pMON rewards</p>
        </motion.div>

        {!isConnected ? (
          <motion.div
            className="bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-gray-400">Connect your wallet to view achievements</p>
          </motion.div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🦞</div>
            <p className="text-gray-400">Loading achievements...</p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <motion.div
              className="mb-8 bg-slate-800/50 rounded-xl p-6 border border-slate-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Progress</span>
                <span className="text-lobster-400">
                  {progress.unlocked} / {progress.total} ({progress.percent}%)
                </span>
              </div>
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-lobster-500 to-ocean-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Category Filter */}
            <motion.div
              className="flex gap-2 mb-6 overflow-x-auto pb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-lobster-500 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-lobster-500 text-white'
                      : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </motion.div>

            {/* Achievements Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredAchievements.map((ach, index) => {
                const rarityColor = RARITY_COLORS[ach.rarity || 'common']
                const rarityGlow = RARITY_GLOW[ach.rarity || 'common']

                return (
                  <motion.div
                    key={ach.achievementId}
                    className={`rounded-xl p-4 border transition-all ${
                      ach.isUnlocked
                        ? `bg-gradient-to-br ${rarityColor} bg-opacity-20 border-white/20 ${rarityGlow}`
                        : 'bg-slate-800/30 border-slate-700/50 opacity-60'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                          ach.isUnlocked
                            ? `bg-gradient-to-br ${rarityColor}`
                            : 'bg-slate-700'
                        }`}
                      >
                        {ach.isUnlocked ? ach.emoji : '🔒'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{ach.name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              ach.rarity === 'legendary'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : ach.rarity === 'epic'
                                ? 'bg-purple-500/20 text-purple-400'
                                : ach.rarity === 'rare'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {ach.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{ach.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            +{ach.pmonReward} pMON
                          </span>
                          {ach.isUnlocked && ach.unlockedAt && (
                            <span className="text-xs text-green-400">
                              ✓ Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}

        {/* New Unlock Notification */}
        <AnimatePresence>
          {newUnlocks.length > 0 && (
            <motion.div
              className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
            >
              <div className="bg-gradient-to-r from-lobster-600 to-ocean-600 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <p className="font-semibold">Achievement Unlocked!</p>
                    <p className="text-sm text-white/80">
                      {newUnlocks.map((u) => u.name).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setNewUnlocks([])}
                    className="ml-4 text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
