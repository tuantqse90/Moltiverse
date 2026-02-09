'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTwitterAuth } from '../../hooks/useTwitterAuth'

interface TwitterConnectButtonProps {
  walletAddress: string | undefined
  twitterUsername?: string
  onConnected?: () => void
  onDisconnected?: () => void
}

export function TwitterConnectButton({
  walletAddress,
  twitterUsername,
  onConnected,
  onDisconnected,
}: TwitterConnectButtonProps) {
  const {
    isConfigured,
    loading,
    error,
    authSuccess,
    startAuth,
    clearAuthSuccess,
  } = useTwitterAuth(walletAddress)

  useEffect(() => {
    if (authSuccess) {
      onConnected?.()
      clearAuthSuccess()
    }
  }, [authSuccess, onConnected, clearAuthSuccess])

  if (!isConfigured) {
    return (
      <div className="text-gray-500 text-sm text-center py-2">
        Twitter connection not available
      </div>
    )
  }

  if (twitterUsername) {
    return (
      <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-4 py-3">
        <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium">Connected</p>
          <p className="text-xs text-blue-400">@{twitterUsername}</p>
        </div>
        <button
          onClick={onDisconnected}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <motion.button
        onClick={startAuth}
        disabled={loading || !walletAddress}
        className="flex items-center justify-center gap-2 w-full bg-[#1DA1F2] hover:bg-[#1a8cd8] disabled:bg-slate-600 text-white py-3 rounded-xl transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        {loading ? 'Connecting...' : 'Connect X/Twitter'}
      </motion.button>
      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  )
}
