'use client'

import { motion } from 'framer-motion'

interface WealthDisplayProps {
  wealth: string | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-sm px-2 py-1',
  md: 'text-base px-3 py-2',
  lg: 'text-lg px-4 py-3',
}

export function WealthDisplay({ wealth, showLabel = true, size = 'md' }: WealthDisplayProps) {
  const formattedWealth = formatWealth(wealth)

  return (
    <motion.div
      className={`bg-slate-700/50 rounded-lg ${sizeClasses[size]} inline-flex items-center gap-2`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {showLabel && (
        <span className="text-gray-400">Balance:</span>
      )}
      <span className="text-lobster-400 font-medium">{formattedWealth}</span>
      <span className="text-gray-500">MON</span>
    </motion.div>
  )
}

function formatWealth(wealth: string | null): string {
  if (!wealth) return '0.0000'

  const num = parseFloat(wealth)

  if (isNaN(num)) return '0.0000'

  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num.toFixed(4)
}
