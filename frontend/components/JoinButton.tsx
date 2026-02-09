'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { WalletButton } from '@/components/WalletButton'

interface JoinButtonProps {
  onJoin: () => void
  isPending: boolean
  isConfirming: boolean
  hasJoined: boolean
  entryFee: string
}

export function JoinButton({ onJoin, isPending, isConfirming, hasJoined, entryFee }: JoinButtonProps) {
  const { isConnected } = useWallet() // Now uses shared global state
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering client-specific content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state during SSR/hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="text-center">
        <div className="h-12 bg-slate-700/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center">
        <WalletButton />
      </div>
    )
  }

  if (hasJoined) {
    return (
      <motion.div
        className="bg-green-600/20 border border-green-500 rounded-xl p-4 md:p-6 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-3xl md:text-4xl mb-2">✅</div>
        <p className="text-green-400 font-semibold text-base md:text-lg">You're in the pot!</p>
        <p className="text-gray-400 text-xs md:text-sm mt-1">Good luck, lobster!</p>
      </motion.div>
    )
  }

  return (
    <motion.button
      onClick={onJoin}
      disabled={isPending || isConfirming}
      className={`w-full py-4 md:py-6 px-4 md:px-8 rounded-xl text-lg md:text-2xl font-bold transition-all active:scale-95 ${
        isPending || isConfirming
          ? 'bg-gray-600 cursor-not-allowed'
          : 'bg-gradient-to-r from-lobster-500 to-lobster-600 hover:from-lobster-400 hover:to-lobster-500 glow-lobster'
      }`}
      whileHover={!isPending && !isConfirming ? { scale: 1.02 } : {}}
      whileTap={!isPending && !isConfirming ? { scale: 0.98 } : {}}
    >
      {isPending ? (
        <span className="flex items-center justify-center gap-2 md:gap-3">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            🦞
          </motion.span>
          Confirming...
        </span>
      ) : isConfirming ? (
        <span className="flex items-center justify-center gap-2 md:gap-3">
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            ⏳
          </motion.span>
          Jumping in...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
          <span>🦞</span>
          <span>Jump in the Pot</span>
          <span className="text-sm md:text-lg font-normal">({entryFee} MON)</span>
        </span>
      )}
    </motion.button>
  )
}
