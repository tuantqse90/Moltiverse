'use client'

import { motion } from 'framer-motion'
import { useSound } from '@/hooks/useSound'

interface SoundToggleProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function SoundToggle({ size = 'md', showLabel = false }: SoundToggleProps) {
  const { isMuted, toggleMute, play } = useSound()

  const sizes = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  }

  const handleClick = () => {
    toggleMute()
    if (isMuted) {
      // Play a quick sound when unmuting
      setTimeout(() => play('click'), 50)
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      className={`${sizes[size]} flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      <span>{isMuted ? '🔇' : '🔊'}</span>
      {showLabel && (
        <span className="text-sm text-gray-400">
          {isMuted ? 'Muted' : 'Sound On'}
        </span>
      )}
    </motion.button>
  )
}
