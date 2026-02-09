'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface PotTimerProps {
  timeRemaining: number // in seconds
  potAmount: string
  participantCount: number
}

export function PotTimer({ timeRemaining, potAmount, participantCount }: PotTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining)

  useEffect(() => {
    setDisplayTime(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    if (displayTime <= 0) return

    const timer = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [displayTime])

  const minutes = Math.floor(displayTime / 60)
  const seconds = displayTime % 60

  const isUrgent = displayTime < 60
  const isEnding = displayTime < 10

  return (
    <div className="text-center">
      {/* Timer */}
      <motion.div
        className={`text-5xl sm:text-6xl md:text-8xl font-bold mb-3 md:mb-4 font-mono ${
          isEnding ? 'text-lobster-500 animate-pulse-fast' : isUrgent ? 'text-yellow-400' : 'text-white'
        }`}
        animate={isEnding ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </motion.div>

      {/* Pot Amount */}
      <motion.div
        className="mb-4 md:mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-sm md:text-lg text-gray-400 mb-1">Current Pot</div>
        <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-ocean-400 glow-ocean">
          {potAmount} <span className="text-lg md:text-2xl">MON</span>
        </div>
      </motion.div>

      {/* Participant Count */}
      <motion.div
        className="flex items-center justify-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-4xl md:text-6xl">🦞</span>
        <span className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-300">
          {participantCount} lobster{participantCount !== 1 ? 's' : ''} in the pot
        </span>
      </motion.div>

      {/* Urgency message */}
      {isUrgent && (
        <motion.div
          className="mt-3 md:mt-4 text-base md:text-xl font-semibold text-yellow-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isEnding ? '🔥 ABOUT TO BOIL! 🔥' : '⏰ Last chance to join!'}
        </motion.div>
      )}
    </div>
  )
}
