'use client'

import { motion } from 'framer-motion'
import { usePMon, type PMonBalance as PMonBalanceType } from '../../hooks/usePMon'

interface PMonBalanceProps {
  walletAddress: string | undefined
  compact?: boolean
  showClaimButton?: boolean
}

export function PMonBalance({ walletAddress, compact = false, showClaimButton = true }: PMonBalanceProps) {
  const { balance, loading, claimDaily } = usePMon(walletAddress)

  const handleClaimDaily = async () => {
    const result = await claimDaily()
    if (result.success) {
      // Could show toast notification here
      console.log(`Claimed ${result.points} pMON!`)
    }
  }

  if (loading && !balance) {
    return (
      <div className="animate-pulse bg-slate-700/30 rounded-lg h-12 w-32" />
    )
  }

  if (!balance) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
        <span className="text-lg">{balance.tierInfo.emoji}</span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-lobster-400">
            {formatNumber(balance.balance)} pMON
          </span>
          <span className="text-xs text-gray-500">{balance.tierInfo.name}</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm border border-slate-700"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{balance.tierInfo.emoji}</span>
          <div>
            <div className="text-xl font-bold text-lobster-400">
              {formatNumber(balance.balance)} pMON
            </div>
            <div className="text-xs text-gray-400">
              Total earned: {formatNumber(balance.totalEarned)}
            </div>
          </div>
        </div>

        <div
          className="text-sm font-medium px-3 py-1 rounded-full"
          style={{ backgroundColor: `${balance.tierInfo.color}20`, color: balance.tierInfo.color }}
        >
          {balance.tierInfo.name}
        </div>
      </div>

      {/* Breakdown (Owner + Agent) */}
      {balance.breakdown && (
        <div className="mb-3 bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">Balance Breakdown</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <div className="text-xs text-gray-400">👤 You</div>
              <div className="text-sm font-medium text-white">
                {formatNumber(balance.breakdown.owner.balance)} pMON
              </div>
            </div>
            {balance.breakdown.agent && (
              <>
                <div className="text-gray-600">+</div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-gray-400">🤖 Agent</div>
                  <div className="text-sm font-medium text-purple-400">
                    {formatNumber(balance.breakdown.agent.balance)} pMON
                  </div>
                </div>
                <div className="text-gray-600">=</div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-gray-400">Total</div>
                  <div className="text-sm font-bold text-lobster-400">
                    {formatNumber(balance.balance)} pMON
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress bar to next tier */}
      {balance.progress && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{balance.tierInfo.name}</span>
            <span>{balance.tierInfo.nextTier || 'Max'}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: balance.tierInfo.color }}
              initial={{ width: 0 }}
              animate={{ width: `${balance.progress.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {formatNumber(balance.totalEarned)} / {formatNumber(balance.progress.next)} pMON
          </div>
        </div>
      )}

      {/* Daily claim button */}
      {showClaimButton && (
        <motion.button
          onClick={handleClaimDaily}
          className="w-full py-2 px-4 bg-gradient-to-r from-lobster-500 to-ocean-500 rounded-lg text-white font-medium text-sm hover:from-lobster-400 hover:to-ocean-400 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Claim Daily Bonus (+5 pMON)
        </motion.button>
      )}
    </motion.div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}
