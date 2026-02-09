'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiPiece {
  id: number
  x: number
  emoji: string
  delay: number
  duration: number
  rotate: number
}

interface ConfettiProps {
  isActive: boolean
  emojis?: string[]
  count?: number
  duration?: number
}

export function Confetti({
  isActive,
  emojis = ['🦞', '🎉', '✨', '🌟', '💰', '🔥'],
  count = 30,
  duration = 3000,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (isActive) {
      const newPieces = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        rotate: Math.random() * 360,
      }))
      setPieces(newPieces)

      const timer = setTimeout(() => {
        setPieces([])
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isActive, count, emojis, duration])

  return (
    <AnimatePresence>
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="fixed pointer-events-none text-2xl md:text-3xl z-[200]"
          style={{ left: `${piece.x}%` }}
          initial={{ top: -50, opacity: 1, rotate: 0 }}
          animate={{
            top: '110vh',
            opacity: [1, 1, 0],
            rotate: piece.rotate,
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'linear',
          }}
        >
          {piece.emoji}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// Floating emoji celebration
interface FloatingEmojisProps {
  isActive: boolean
  emoji?: string
  count?: number
}

export function FloatingEmojis({
  isActive,
  emoji = '🦞',
  count = 10,
}: FloatingEmojisProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isActive) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: '-50px',
          }}
          animate={{
            y: [0, -window.innerHeight - 100],
            x: [0, (Math.random() - 0.5) * 100],
            rotate: [0, Math.random() * 360],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: i * 0.1,
            ease: 'easeOut',
          }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  )
}

// Pulse ring effect
interface PulseRingProps {
  isActive: boolean
  color?: string
}

export function PulseRing({ isActive, color = 'lobster' }: PulseRingProps) {
  if (!isActive) return null

  const colorClasses = {
    lobster: 'border-lobster-500',
    ocean: 'border-ocean-500',
    green: 'border-green-500',
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`absolute w-full h-full rounded-full border-2 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.lobster}`}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 1.5,
            delay: i * 0.3,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}
