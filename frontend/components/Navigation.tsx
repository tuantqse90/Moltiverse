'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProfileAvatar } from './profile/ProfileAvatar'
import { useAvatarUrl } from '@/hooks/useProfile'
import { useWallet } from '@/hooks/useWallet'

// All nav items
const NAV_ITEMS = [
  { name: 'Play', href: '/', icon: '🎮' },
  { name: 'Spin', href: '/spin', icon: '🎰' },
  { name: 'NFT', href: '/nft', icon: '🦞' },
  // { name: 'Dating', href: '/dating', icon: '💕' }, // Hidden temporarily
  { name: 'My Agent', href: '/my-agent', icon: '🤖' },
  { name: 'pMON', href: '/pmon', icon: '💎' },
  { name: 'Referrals', href: '/referrals', icon: '🎁' },
]

// Mobile items with descriptions
const MOBILE_NAV_ITEMS = [
  { name: 'Play', href: '/', icon: '🎮', description: 'Join the pot' },
  { name: 'Spin', href: '/spin', icon: '🎰', description: 'Lucky wheel' },
  { name: 'NFT', href: '/nft', icon: '🦞', description: 'Lobster Robot NFT' },
  // { name: 'Dating', href: '/dating', icon: '💕', description: 'Agent dating' }, // Hidden temporarily
  { name: 'My Agent', href: '/my-agent', icon: '🤖', description: 'Auto-play bot' },
  { name: 'pMON', href: '/pmon', icon: '💎', description: 'Points & rewards' },
  { name: 'Referrals', href: '/referrals', icon: '🎁', description: 'Invite friends' },
  { name: 'Profile', href: '/profile', icon: '👤', description: 'Your profile' },
]

export function Navigation() {
  const pathname = usePathname()
  const { address, isConnecting, connect, disconnect } = useWallet()
  const avatarData = useAvatarUrl(address || undefined)
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="max-w-6xl mx-auto bg-monad-900/80 backdrop-blur-2xl rounded-2xl border border-monad-700/40 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between h-14 px-4">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5">
                <motion.span
                  className="text-2xl"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  🦞
                </motion.span>
                <span className="text-lg font-bold text-white">
                  Lobster<span className="text-monad-400">Pot</span>
                </span>
              </Link>

              {/* Center Nav */}
              <div className="flex items-center gap-0.5">
                <Link href="/skill">
                  <motion.div
                    className="relative px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold mr-1 transition-colors text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>🦀</span>
                    <span>Skills</span>
                  </motion.div>
                </Link>
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        className={`relative px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-monad-300 hover:text-white hover:bg-monad-800/50'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="nav-indicator"
                            className="absolute inset-0 bg-monad-600 rounded-lg"
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                          />
                        )}
                        <span className="relative z-10 text-base">{item.icon}</span>
                        <span className="relative z-10">{item.name}</span>
                      </motion.div>
                    </Link>
                  )
                })}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3">
                {mounted && address && (
                  <Link href="/profile">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <ProfileAvatar avatarUrl={avatarData.url} nftSeed={avatarData.nftSeed} size="sm" showBorder />
                    </motion.div>
                  </Link>
                )}
                {mounted ? (
                  address ? (
                    <motion.button
                      onClick={disconnect}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-monad-800/60 hover:bg-monad-700/60 border border-monad-700/50 transition-colors"
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-monad-200">{address.slice(0, 6)}...{address.slice(-4)}</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={connect}
                      disabled={isConnecting}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-monad-600 hover:bg-monad-500 disabled:opacity-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </motion.button>
                  )
                ) : (
                  <div className="h-9 w-28 bg-monad-800/50 rounded-xl animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50">
        <div className="mx-3 mt-3">
          <div className="bg-monad-900/90 backdrop-blur-2xl rounded-2xl border border-monad-700/40 shadow-lg">
            <div className="flex items-center justify-between h-14 px-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl">🦞</span>
                <span className="font-bold text-white">Lobster<span className="text-monad-400">Pot</span></span>
              </Link>

              <div className="flex items-center gap-2">
                {mounted && (
                  address ? (
                    <button
                      onClick={disconnect}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-monad-800/60 border border-monad-700/50"
                    >
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <span className="text-monad-200">{address.slice(0, 4)}...{address.slice(-3)}</span>
                    </button>
                  ) : (
                    <button
                      onClick={connect}
                      disabled={isConnecting}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-monad-600 disabled:opacity-50"
                    >
                      {isConnecting ? '...' : 'Connect'}
                    </button>
                  )
                )}
                <motion.button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-monad-800/60 border border-monad-700/50"
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="flex flex-col gap-1"
                    animate={mobileMenuOpen ? "open" : "closed"}
                  >
                    <motion.span
                      className="w-4 h-0.5 bg-monad-300 rounded-full block"
                      variants={{
                        open: { rotate: 45, y: 3 },
                        closed: { rotate: 0, y: 0 }
                      }}
                    />
                    <motion.span
                      className="w-4 h-0.5 bg-monad-300 rounded-full block"
                      variants={{
                        open: { rotate: -45, y: -3 },
                        closed: { rotate: 0, y: 0 }
                      }}
                    />
                  </motion.div>
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-monad-700/30"
                >
                  <div className="p-2 space-y-0.5">
                    <Link href="/skill" onClick={() => setMobileMenuOpen(false)}>
                      <motion.div
                        className="flex items-center gap-3 p-3 rounded-xl transition-colors text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15"
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-lg w-7 text-center">🦀</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">OpenClaw Skills</div>
                          <div className="text-xs text-amber-400/60">Agent capabilities</div>
                        </div>
                      </motion.div>
                    </Link>
                    {MOBILE_NAV_ITEMS.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                          <motion.div
                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              isActive
                                ? 'bg-monad-600/25 text-white'
                                : 'text-monad-300 hover:bg-monad-800/50 hover:text-white'
                            }`}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span className="text-lg w-7 text-center">{item.icon}</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{item.name}</div>
                              <div className="text-xs text-monad-500">{item.description}</div>
                            </div>
                            {isActive && <div className="w-1.5 h-1.5 bg-monad-400 rounded-full" />}
                          </motion.div>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-20 md:h-24" />

    </>
  )
}
