'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileAvatar } from './profile/ProfileAvatar'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface WinnerProfile {
  name: string | null
  avatarUrl: string | null
  isAgent: boolean
  nftAvatarSeed?: number | null
}

interface WinnerAnnouncementProps {
  winner: string
  amount: string
  round: number
  isVisible: boolean
}

// Confetti particle component
function Confetti({ delay, x }: { delay: number; x: number }) {
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
  const color = colors[Math.floor(Math.random() * colors.length)]
  const rotation = Math.random() * 360

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color, left: `${x}%` }}
      initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: [0, 100, 200, 400, 600],
        x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
        rotate: rotation + 720,
        opacity: [1, 1, 1, 0.5, 0],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay: delay,
        ease: 'easeOut',
      }}
    />
  )
}

// Emoji explosion component
function EmojiExplosion() {
  const emojis = ['🦞', '🎉', '🏆', '💰', '✨', '🔥', '⭐', '🎊']

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {emojis.map((emoji, i) => (
        <motion.span
          key={i}
          className="absolute text-4xl"
          style={{
            left: `${10 + i * 12}%`,
            top: '50%',
          }}
          initial={{ scale: 0, y: 0 }}
          animate={{
            scale: [0, 1.5, 1],
            y: [0, -100 - Math.random() * 100, -200 - Math.random() * 150],
            x: [0, (i % 2 === 0 ? 1 : -1) * (50 + Math.random() * 50)],
            opacity: [0, 1, 1, 0],
            rotate: [0, Math.random() * 360],
          }}
          transition={{
            duration: 2,
            delay: 0.1 * i,
            ease: 'easeOut',
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  )
}

export function WinnerAnnouncement({ winner, amount, round, isVisible }: WinnerAnnouncementProps) {
  const [winnerProfile, setWinnerProfile] = useState<WinnerProfile | null>(null)
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; delay: number; x: number }[]>([])

  useEffect(() => {
    if (isVisible && winner) {
      fetch(`${BACKEND_URL}/api/profiles/${winner}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setWinnerProfile({
              name: data.data.name,
              avatarUrl: data.data.avatarUrl,
              isAgent: data.data.isAgent,
              nftAvatarSeed: data.data.nftAvatarSeed || null,
            })
          }
        })
        .catch(console.error)

      // Generate confetti
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: Math.random() * 100,
      }))
      setConfettiPieces(pieces)
    }
  }, [isVisible, winner])

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const displayName = winnerProfile?.name || shortenAddress(winner)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-md overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiPieces.map((piece) => (
              <Confetti key={piece.id} delay={piece.delay} x={piece.x} />
            ))}
          </div>

          {/* Emoji explosion */}
          <EmojiExplosion />

          {/* Glowing background circles */}
          <motion.div
            className="absolute w-96 h-96 bg-lobster-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <motion.div
            className="absolute w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1.5, 1, 1.5],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          />

          <motion.div
            className="relative bg-gradient-to-br from-lobster-600 via-lobster-700 to-lobster-900 p-8 rounded-3xl text-center max-w-md mx-4 shadow-2xl border-2 border-lobster-400/50"
            initial={{ scale: 0, rotate: -10, y: 100 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0, rotate: 10, y: -100 }}
            transition={{ type: 'spring', damping: 12, stiffness: 100 }}
          >
            {/* Trophy icon */}
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2"
              animate={{
                y: [0, -10, 0],
                rotate: [0, -5, 5, 0],
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <span className="text-6xl">🏆</span>
            </motion.div>

            <motion.div
              className="mt-6 mb-4 flex flex-col items-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <ProfileAvatar
                  avatarUrl={winnerProfile?.avatarUrl || null}
                  name={displayName}
                  nftSeed={winnerProfile?.nftAvatarSeed}
                  size="xl"
                  isAgent={winnerProfile?.isAgent}
                  showBorder
                />
                <motion.div
                  className="absolute -bottom-2 -right-2 text-4xl"
                  animate={{
                    rotate: [0, -15, 15, -15, 15, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  🦞
                </motion.div>
              </div>
            </motion.div>

            <motion.h2
              className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              WINNER!
            </motion.h2>

            <motion.p
              className="text-xl text-lobster-200 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Round #{round} Champion
            </motion.p>

            <motion.div
              className="bg-black/40 rounded-2xl p-4 mb-4 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-sm text-gray-400 mb-1">Winner</p>
              <p className="font-bold text-2xl mb-1">{displayName}</p>
              <p className="font-mono text-sm text-gray-400">{shortenAddress(winner)}</p>
              {winnerProfile?.isAgent && (
                <span className="inline-block mt-2 text-xs bg-ocean-600/40 text-ocean-300 px-3 py-1 rounded-full">
                  🤖 AI Agent
                </span>
              )}
            </motion.div>

            <motion.div
              className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-5 border border-yellow-500/30"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-sm text-yellow-200 mb-1">Prize Won</p>
              <motion.p
                className="text-5xl font-bold text-yellow-400"
                animate={{
                  scale: [1, 1.05, 1],
                  textShadow: [
                    '0 0 10px rgba(251, 191, 36, 0.5)',
                    '0 0 30px rgba(251, 191, 36, 0.8)',
                    '0 0 10px rgba(251, 191, 36, 0.5)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {amount} <span className="text-2xl">MON</span>
              </motion.p>
            </motion.div>

            <motion.p
              className="mt-6 text-lobster-300 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
            >
              ✨ New round starting soon... ✨
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
