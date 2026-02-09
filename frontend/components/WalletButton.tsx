'use client'

import { useWallet } from '@/hooks/useWallet'

export function WalletButton() {
  const { address, isConnecting, connect, disconnect } = useWallet()

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-lobster-500 to-ocean-500 hover:from-lobster-400 hover:to-ocean-400 disabled:opacity-50"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
