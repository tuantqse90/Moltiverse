'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { WalletButton } from '@/components/WalletButton'
import Link from 'next/link'
import { useProfile } from '../../hooks/useProfile'
import { usePMon } from '../../hooks/usePMon'
import { ProfileCard, ProfileEditModal, NFTAvatarPicker } from '../../components/profile'
import { Navigation } from '../../components/Navigation'
import { PMonBalance } from '../../components/pmon/PMonBalance'

export default function ProfilePage() {
  const { address, isConnected } = useWallet()
  const { profile, loading, error, updateProfile, fetchProfile, disconnectTwitter, setNftAvatar } = useProfile(address)
  const { balance: pmonBalance } = usePMon(address)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isNftPickerOpen, setIsNftPickerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

          {!isConnected ? (
            <motion.div
              className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="text-6xl mb-4 block">🦞</span>
              <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your wallet to view and edit your profile
              </p>
              <WalletButton />
            </motion.div>
          ) : loading ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lobster-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-red-700/50">
              <span className="text-4xl mb-4 block">⚠️</span>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchProfile}
                className="bg-lobster-600 hover:bg-lobster-500 px-6 py-2 rounded-xl transition-colors"
              >
                Retry
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              <ProfileCard
                profile={profile}
                onEdit={() => setIsEditModalOpen(true)}
              />

              {/* pMON Stats */}
              <motion.div
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>🏆</span> Your pMON Stats
                </h2>
                <PMonBalance walletAddress={address} />
              </motion.div>

              {/* Game Stats */}
              <motion.div
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>📊</span> Game Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-lobster-400">
                      {pmonBalance?.totalEarned ? Math.floor((pmonBalance.totalEarned || 0) / 10) : 0}
                    </div>
                    <div className="text-sm text-gray-500">Games Played</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {pmonBalance?.totalEarned ? Math.floor((pmonBalance.totalEarned || 0) / 500) : 0}
                    </div>
                    <div className="text-sm text-gray-500">Wins</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      {pmonBalance?.streakDays || 0}
                    </div>
                    <div className="text-sm text-gray-500">Day Streak</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {pmonBalance?.tier ? pmonBalance.tier.charAt(0).toUpperCase() + pmonBalance.tier.slice(1) : 'Bronze'}
                    </div>
                    <div className="text-sm text-gray-500">Tier</div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/">
                    <motion.div
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-lobster-500/50 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl mb-2 block">🎰</span>
                      <h3 className="font-semibold text-sm">Join Pot</h3>
                    </motion.div>
                  </Link>

                  <Link href="/pmon">
                    <motion.div
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-yellow-500/50 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl mb-2 block">🏆</span>
                      <h3 className="font-semibold text-sm">Leaderboard</h3>
                    </motion.div>
                  </Link>

                  <Link href="/agents">
                    <motion.div
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-ocean-500/50 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl mb-2 block">🤖</span>
                      <h3 className="font-semibold text-sm">My Agent</h3>
                    </motion.div>
                  </Link>

                  <motion.div
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-pink-500/50 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <span className="text-2xl mb-2 block">✏️</span>
                    <h3 className="font-semibold text-sm">Edit Profile</h3>
                  </motion.div>
                </div>
              </motion.div>

              {/* Twitter Section */}
              {!profile.twitterUsername && (
                <motion.div
                  className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 rounded-xl p-6 border border-blue-700/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600/20 p-3 rounded-xl">
                      <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Connect X/Twitter</h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Link your X account to display your profile picture and username
                      </p>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        Connect Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : null}
        </motion.div>
      </main>

      {/* Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={updateProfile}
        walletAddress={address}
        onTwitterConnected={fetchProfile}
        onSetNftAvatar={() => {
          setIsEditModalOpen(false)
          setIsNftPickerOpen(true)
        }}
      />

      {/* NFT Avatar Picker */}
      <NFTAvatarPicker
        isOpen={isNftPickerOpen}
        onClose={() => setIsNftPickerOpen(false)}
        walletAddress={address}
        currentNftSeed={profile?.nftAvatarSeed}
        onSelect={setNftAvatar}
      />
    </div>
  )
}
