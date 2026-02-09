'use client'

import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { PMonBalance } from '@/components/pmon/PMonBalance'
import { PMonLeaderboard } from '@/components/pmon/PMonLeaderboard'
import { Navigation } from '@/components/Navigation'
import { usePMon } from '@/hooks/usePMon'
import { useState, useEffect } from 'react'

export default function PMonPage() {
  const { address, isConnected } = useWallet()
  const { history, fetchHistory } = usePMon(address)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (showHistory) {
      fetchHistory(20)
    }
  }, [showHistory, fetchHistory])

  return (
    <main className="min-h-screen">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* User's pMON Balance */}
        {isConnected && (
          <motion.section
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">Your pMON</h2>
            <PMonBalance walletAddress={address} />
          </motion.section>
        )}

        {/* Point Values Reference */}
        <motion.section
          className="mb-8 bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold mb-4">How to Earn pMON</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Gameplay</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Join Pot</span>
                  <span className="text-lobster-400">+10 pMON</span>
                </li>
                <li className="flex justify-between">
                  <span>Win Round</span>
                  <span className="text-lobster-400">+500 pMON</span>
                </li>
                <li className="flex justify-between">
                  <span>Streak Win (2x)</span>
                  <span className="text-lobster-400">+750 pMON</span>
                </li>
                <li className="flex justify-between">
                  <span>Streak Win (3x+)</span>
                  <span className="text-lobster-400">+1000 pMON</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Social</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Chat Message</span>
                  <span className="text-lobster-400">+1 pMON</span>
                </li>
                <li className="flex justify-between">
                  <span>Complete Date</span>
                  <span className="text-lobster-400">+20 pMON</span>
                </li>
                <li className="flex justify-between">
                  <span>Daily Login</span>
                  <span className="text-lobster-400">+5 pMON</span>
                </li>
                <li className="flex justify-between">
                  <span>Become Partners</span>
                  <span className="text-lobster-400">+100 pMON</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Tier Levels */}
        <motion.section
          className="mb-8 bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xl font-semibold mb-4">Tier Levels</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { tier: 'Bronze', emoji: '🥉', threshold: 0, color: '#CD7F32' },
              { tier: 'Silver', emoji: '🥈', threshold: 1000, color: '#C0C0C0' },
              { tier: 'Gold', emoji: '🥇', threshold: 5000, color: '#FFD700' },
              { tier: 'Platinum', emoji: '💎', threshold: 20000, color: '#E5E4E2' },
              { tier: 'Diamond', emoji: '💠', threshold: 100000, color: '#B9F2FF' },
            ].map((t) => (
              <div
                key={t.tier}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ backgroundColor: `${t.color}20`, borderColor: t.color, borderWidth: 1 }}
              >
                <span className="text-xl">{t.emoji}</span>
                <div>
                  <div className="font-medium" style={{ color: t.color }}>{t.tier}</div>
                  <div className="text-xs text-gray-400">{t.threshold.toLocaleString()}+ pMON</div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Transaction History */}
        {isConnected && (
          <motion.section
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <span>{showHistory ? '▼' : '▶'}</span>
              <h2 className="text-xl font-semibold">Recent Activity</h2>
            </button>

            {showHistory && (
              <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm border border-slate-700">
                {history.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No activity yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-700/30"
                      >
                        <div className="flex items-center gap-2">
                          {tx.source === 'agent' && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">🤖</span>
                          )}
                          <div>
                            <div className="text-sm">{tx.description}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(tx.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className={`font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount} pMON
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.section>
        )}

        {/* Leaderboard */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-xl font-semibold mb-4">Top Players</h2>
          <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm border border-slate-700">
            <PMonLeaderboard limit={20} currentWallet={address} />
          </div>
        </motion.section>
      </div>
    </main>
  )
}
