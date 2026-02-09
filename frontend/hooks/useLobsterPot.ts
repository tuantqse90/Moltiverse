'use client'

import { useState, useCallback } from 'react'
import { parseEther, formatEther, createPublicClient, createWalletClient, custom, http } from 'viem'
import { monad } from '@/config/chains'
import { getWalletProvider } from '@/hooks/useWallet'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`

const LOBSTERPOT_ABI = [
  {
    name: 'joinPot',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getCurrentRoundInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'round', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'potAmount', type: 'uint256' },
      { name: 'participantCount', type: 'uint256' },
      { name: 'isEnded', type: 'bool' },
    ],
  },
  {
    name: 'getTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'hasJoined',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getParticipants',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'ENTRY_FEE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function useLobsterPot() {
  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const joinPot = useCallback(async () => {
    setIsPending(true)
    setIsSuccess(false)
    setError(null)

    try {
      // Use the same provider as useWallet (EIP-6963 aware, health-checked)
      const provider = await getWalletProvider()
      if (!provider) {
        throw new Error('No wallet found. Please install a wallet extension.')
      }

      const accounts = await provider.request({ method: 'eth_accounts' })
      if (!accounts?.[0]) {
        throw new Error('Please connect wallet first')
      }

      const walletClient = createWalletClient({
        chain: monad,
        transport: custom(provider),
      })

      setIsPending(false)
      setIsConfirming(true)

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: LOBSTERPOT_ABI,
        functionName: 'joinPot',
        value: parseEther('0.01'),
        account: accounts[0] as `0x${string}`,
      })

      // Wait for transaction receipt
      const publicClient = createPublicClient({
        chain: monad,
        transport: http(),
      })

      await publicClient.waitForTransactionReceipt({ hash })

      setIsConfirming(false)
      setIsSuccess(true)
    } catch (err: any) {
      console.error('Join pot error:', err)
      setError(err)
      setIsPending(false)
      setIsConfirming(false)
    }
  }, [])

  return {
    joinPot,
    isPending,
    isConfirming,
    isSuccess,
    error,
    entryFee: '0.01',
  }
}
