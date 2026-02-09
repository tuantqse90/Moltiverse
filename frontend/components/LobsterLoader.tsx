'use client'

import { motion } from 'framer-motion'

interface LobsterLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  showDots?: boolean
}

export function LobsterLoader({
  size = 'md',
  text = 'Loading...',
  showDots = true
}: LobsterLoaderProps) {
  const sizeMap = {
    sm: { container: 'w-16 h-16', emoji: 'text-2xl', ring: 'border-2' },
    md: { container: 'w-24 h-24', emoji: 'text-4xl', ring: 'border-4' },
    lg: { container: 'w-32 h-32', emoji: 'text-5xl', ring: 'border-4' },
  }

  const s = sizeMap[size]

  return (
    <div className="text-center py-8">
      <div className={`relative ${s.container} mx-auto mb-4`}>
        {/* Outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer ring */}
        <motion.div
          className={`absolute inset-0 rounded-full ${s.ring} border-purple-500/30`}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* Middle ring with gradient effect */}
        <motion.div
          className={`absolute inset-2 rounded-full ${s.ring} border-transparent`}
          style={{
            borderTopColor: '#a855f7',
            borderRightColor: '#ec4899',
            borderBottomColor: '#8b5cf6',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner ring */}
        <motion.div
          className={`absolute inset-4 rounded-full ${s.ring} border-pink-500/20`}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Lobster emoji with animations */}
        <motion.div
          className={`absolute inset-0 flex items-center justify-center ${s.emoji}`}
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 8, -8, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🦞
        </motion.div>

        {/* Sparkle effects */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              top: `${20 + i * 25}%`,
              left: `${10 + i * 35}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Loading text */}
      {text && (
        <motion.p
          className="text-gray-400 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}

      {/* Bouncing dots */}
      {showDots && (
        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Mini loader for inline use
export function LobsterMiniLoader() {
  return (
    <motion.span
      className="inline-flex items-center gap-2"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <motion.span
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        🦞
      </motion.span>
      <span className="text-sm text-gray-400">Loading...</span>
    </motion.span>
  )
}

// Skeleton loader for NFT cards
export function NFTSkeleton() {
  return (
    <div className="bg-slate-700/50 rounded-xl p-3 animate-pulse">
      <div className="aspect-square bg-slate-600/50 rounded-lg mb-2" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-12 bg-slate-600/50 rounded" />
        <div className="h-4 w-16 bg-slate-600/50 rounded" />
      </div>
      <div className="h-3 w-20 bg-slate-600/50 rounded mt-2" />
    </div>
  )
}
