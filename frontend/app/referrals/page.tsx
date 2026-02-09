'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { Navigation } from '@/components/Navigation'
import { useToast } from '@/components/Toast'
import { LoadingError } from '@/components/ErrorBoundary'
import { CardSkeleton } from '@/components/Skeleton'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface ReferralInfo {
  code: string
  totalReferrals: number
  successfulReferrals: number
  totalEarned: number
  referrals: Array<{
    referee: string
    status: string
    reward: number
    completedAt: string | null
  }>
  rewards: {
    REFERRER_BONUS: number
    REFEREE_BONUS: number
  }
}

export default function ReferralsPage() {
  const { address, isConnected } = useWallet()
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const fetchReferralInfo = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    setLoadError(false)

    try {
      const res = await fetch(`${BACKEND_URL}/api/referrals/info/${address}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.success) {
        setReferralInfo(data.data)
        setLoadError(false)
      } else {
        throw new Error(data.message || 'Failed to load')
      }
    } catch (error) {
      console.error('Error fetching referral info:', error)
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (address) {
      fetchReferralInfo()
    } else {
      setIsLoading(false)
    }
  }, [address, fetchReferralInfo])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchReferralInfo()
  }

  const copyReferralLink = () => {
    if (!referralInfo) return

    const link = `${window.location.origin}?ref=${referralInfo.code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Copied!', 'Referral link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const copyReferralCode = () => {
    if (!referralInfo) return

    navigator.clipboard.writeText(referralInfo.code)
    setCopied(true)
    toast.success('Copied!', 'Referral code copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnTwitter = () => {
    if (!referralInfo) return

    const text = `Join me on LobsterPot! Use my referral code ${referralInfo.code} to get ${referralInfo.rewards.REFEREE_BONUS} pMON bonus when you join your first pot! 🦞`
    const url = `${window.location.origin}?ref=${referralInfo.code}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    )
  }

  return (
    <main className="min-h-screen">
      <Navigation />

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="text-4xl mr-2">🎁</span>
              Referral Program
            </h1>
            <p className="text-gray-400">
              Invite friends and earn pMON rewards together!
            </p>
          </div>

          {!isConnected ? (
            <div className="bg-slate-800/50 rounded-2xl p-8 text-center">
              <span className="text-6xl mb-4 block">🔗</span>
              <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
              <p className="text-gray-400">
                Connect your wallet to get your referral code
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : loadError ? (
            <div className="bg-slate-800/50 rounded-2xl p-8">
              <LoadingError onRetry={handleRetry} retryCount={retryCount} maxRetries={3} />
            </div>
          ) : referralInfo ? (
            <>
              {/* Rewards Info */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <motion.div
                  className="bg-gradient-to-br from-lobster-600/20 to-lobster-700/20 border border-lobster-500/30 rounded-2xl p-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block">👆</span>
                    <h3 className="text-lg font-semibold mb-1">You Get</h3>
                    <p className="text-3xl font-bold text-lobster-400">
                      +{referralInfo.rewards.REFERRER_BONUS} pMON
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Per successful referral
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-ocean-600/20 to-ocean-700/20 border border-ocean-500/30 rounded-2xl p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center">
                    <span className="text-4xl mb-2 block">👇</span>
                    <h3 className="text-lg font-semibold mb-1">Friend Gets</h3>
                    <p className="text-3xl font-bold text-ocean-400">
                      +{referralInfo.rewards.REFEREE_BONUS} pMON
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      When they join first pot
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Referral Code */}
              <motion.div
                className="bg-slate-800/50 rounded-2xl p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🔗</span> Your Referral Code
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-slate-700 rounded-xl px-4 py-3 font-mono text-xl text-center">
                    {referralInfo.code}
                  </div>
                  <motion.button
                    onClick={copyReferralCode}
                    className="bg-lobster-600 hover:bg-lobster-500 px-4 py-3 rounded-xl"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {copied ? '✓' : '📋'}
                  </motion.button>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={copyReferralLink}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>🔗</span> Copy Link
                  </motion.button>
                  <motion.button
                    onClick={shareOnTwitter}
                    className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8] py-3 rounded-xl flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>𝕏</span> Share on X
                  </motion.button>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="bg-slate-800/50 rounded-2xl p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📊</span> Your Stats
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold">{referralInfo.totalReferrals}</p>
                    <p className="text-sm text-gray-400">Total Invites</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{referralInfo.successfulReferrals}</p>
                    <p className="text-sm text-gray-400">Completed</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-lobster-400">{referralInfo.totalEarned}</p>
                    <p className="text-sm text-gray-400">pMON Earned</p>
                  </div>
                </div>
              </motion.div>

              {/* Referral List */}
              {referralInfo.referrals.length > 0 && (
                <motion.div
                  className="bg-slate-800/50 rounded-2xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>👥</span> Your Referrals
                  </h3>

                  <div className="space-y-3">
                    {referralInfo.referrals.map((ref, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-700/50 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {ref.status === 'rewarded' ? '✅' : '⏳'}
                          </span>
                          <div>
                            <p className="font-mono text-sm">
                              {ref.referee.slice(0, 8)}...{ref.referee.slice(-6)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {ref.status === 'rewarded' ? 'Completed' : 'Pending'}
                            </p>
                          </div>
                        </div>
                        {ref.status === 'rewarded' && (
                          <span className="text-green-400 font-medium">
                            +{ref.reward} pMON
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* How it works */}
              <motion.div
                className="mt-8 bg-slate-800/30 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="text-lg font-semibold mb-4">How it works</h3>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="p-4">
                    <div className="text-3xl mb-2">1️⃣</div>
                    <p className="text-gray-300">Share your referral code or link</p>
                  </div>
                  <div className="p-4">
                    <div className="text-3xl mb-2">2️⃣</div>
                    <p className="text-gray-300">Friend joins with your code</p>
                  </div>
                  <div className="p-4">
                    <div className="text-3xl mb-2">3️⃣</div>
                    <p className="text-gray-300">Both earn pMON when they play!</p>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="bg-slate-800/50 rounded-2xl p-8">
              <LoadingError onRetry={handleRetry} retryCount={retryCount} maxRetries={3} />
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
