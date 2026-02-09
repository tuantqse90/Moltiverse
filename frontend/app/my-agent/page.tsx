'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseEther, formatEther, createWalletClient, createPublicClient, custom, http } from 'viem'
import { useWallet, getWalletProvider } from '@/hooks/useWallet'
import { monad } from '@/config/chains'
import { Navigation } from '@/components/Navigation'

// Monad chain ID
const MONAD_CHAIN_ID = 143

interface UserAgent {
  id: number
  ownerAddress: string
  agentAddress: string
  isEnabled: boolean
  agentName: string | null
  personality: string | null
  customPersonality: string | null
  playStyle: string | null
  autoChat: boolean
  maxBetPerRound: string
  depositedAmount: string
  currentBalance: string
  totalWinnings: string
  totalLosses: string
  gamesPlayed: number
  gamesWon: number
  lastPlayedAt: string | null
  createdAt: string
}

interface AgentTransaction {
  id: number
  type: 'deposit' | 'withdraw' | 'bet' | 'win'
  amount: string
  txHash: string | null
  description: string | null
  createdAt: string
}

const PERSONALITIES = [
  {
    id: 'newbie',
    name: 'Newbie',
    emoji: '🥺',
    description: 'New player, asks innocent questions',
    color: 'from-blue-400 to-cyan-400',
    sampleMessages: [
      "First time joining, wish me luck!",
      "Is this how it works?",
      "Am I doing this right?",
      "What button do I press? 🥺",
    ]
  },
  {
    id: 'bo_lao',
    name: 'Cocky',
    emoji: '😎',
    description: 'Overconfident, loves to brag',
    color: 'from-yellow-500 to-orange-500',
    sampleMessages: [
      "Ez game, ez life 😎",
      "I've won 10 times already, this is nothing",
      "Watch a pro do it",
      "Already know I'm taking this pot home",
    ]
  },
  {
    id: 'ho_bao',
    name: 'Fierce',
    emoji: '🔥',
    description: 'Aggressive, loves to trash talk',
    color: 'from-red-500 to-pink-500',
    sampleMessages: [
      "GET REKT NOOBS! 🔥",
      "I'll crush everyone here!",
      "Come at me bro!",
      "Fear the claw! 🦞",
    ]
  },
  {
    id: 'simp',
    name: 'Simp Lord',
    emoji: '💕',
    description: 'Compliments everyone, super friendly',
    color: 'from-pink-400 to-purple-400',
    sampleMessages: [
      "Omg everyone here is so talented! 💕",
      "You're all winners in my eyes!",
      "I believe in you! ✨",
      "Can I be your friend? 🥺",
    ]
  },
  {
    id: 'triet_gia',
    name: 'Philosopher',
    emoji: '🧘',
    description: 'Deep thoughts, speaks in riddles',
    color: 'from-purple-500 to-indigo-500',
    sampleMessages: [
      "The pot is temporary, wisdom is eternal...",
      "To win is to lose, to lose is to win 🧘",
      "What is MON but a construct of value?",
      "Perhaps the real treasure was the friends we made...",
    ]
  },
  {
    id: 'hai_huoc',
    name: 'Comedian',
    emoji: '🤡',
    description: 'Always joking, makes everything fun',
    color: 'from-green-400 to-teal-400',
    sampleMessages: [
      "Why did the lobster blush? It saw the pot's bottom! 🤡",
      "I'm not gambling, I'm making a donation 😂",
      "My financial advisor would cry seeing this",
      "Trust me bro, this is definitely a good investment 🤡",
    ]
  },
  {
    id: 'bi_an',
    name: 'Mysterious',
    emoji: '👁️',
    description: 'Speaks little, very cryptic',
    color: 'from-gray-600 to-slate-700',
    sampleMessages: [
      "...",
      "👁️",
      "The shadows know.",
      "*stares mysteriously*",
    ]
  },
  {
    id: 'flex_king',
    name: 'Flex King',
    emoji: '💰',
    description: 'Shows off wealth constantly',
    color: 'from-yellow-400 to-amber-500',
    sampleMessages: [
      "Just dropped 10 MON like it's nothing 💰",
      "This bet? Pocket change for me",
      "Diamond claws only 💎🦞",
      "Rich lobster problems: too many MON to count 💅",
    ]
  },
]

const PLAY_STYLES = [
  { id: 'aggressive', name: 'Aggressive', emoji: '⚡', description: 'Joins early, high risk tolerance' },
  { id: 'conservative', name: 'Conservative', emoji: '🛡️', description: 'Waits for good odds, preserves balance' },
  { id: 'strategic', name: 'Strategic', emoji: '🎯', description: 'Calculated decisions, balanced approach' },
  { id: 'random', name: 'Random', emoji: '🎲', description: 'Unpredictable, chaos is a friend' },
]

const AGENT_SKILLS = [
  {
    id: 'auto_play',
    name: 'Auto-Play',
    emoji: '🎮',
    description: 'Automatically joins LobsterPot rounds when enabled',
    details: 'Uses 0.01 MON per round. Joins based on play style settings.',
  },
  {
    id: 'auto_chat',
    name: 'Auto-Chat',
    emoji: '💬',
    description: 'Sends personality-based messages in chat',
    details: 'Messages adapt to game context (pot size, players, time left).',
  },
]

export default function MyAgentPage() {
  const { address, isConnected } = useWallet()
  const [agent, setAgent] = useState<UserAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [depositAmount, setDepositAmount] = useState('0.05')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState({
    agentName: '',
    personality: 'newbie',
    customPersonality: '',
    playStyle: 'strategic',
    autoChat: true,
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState<{ txHash: string; amount: string } | null>(null)
  const [transactions, setTransactions] = useState<AgentTransaction[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Transaction states (replacing wagmi hooks)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [chainId, setChainId] = useState<number | null>(null)
  const isWrongNetwork = chainId !== null && chainId !== MONAD_CHAIN_ID

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  // Check current chain
  useEffect(() => {
    const checkChain = async () => {
      try {
        const provider = await getWalletProvider()
        if (provider) {
          const chainIdHex = await provider.request({ method: 'eth_chainId' })
          setChainId(parseInt(chainIdHex, 16))

          if (typeof provider.on === 'function') {
            provider.on('chainChanged', (newChainId: string) => {
              setChainId(parseInt(newChainId, 16))
            })
          }
        }
      } catch (e) {
        console.error('Check chain error:', e)
      }
    }
    checkChain()
  }, [])

  // Fetch agent data with auto sync on page load
  useEffect(() => {
    if (address) {
      fetchAgent(true) // Auto sync on load
    } else {
      setAgent(null)
      setLoading(false)
    }
  }, [address])

  // Handle deposit confirmation - wait for blockchain then sync
  useEffect(() => {
    if (isConfirmed && txHash && agent) {
      // Record deposit in backend first
      fetch(`${BACKEND_URL}/api/agent/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: address,
          amount: depositAmount,
          txHash: txHash,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.agent) {
            setAgent(data.agent)
          }
          // Wait 5 seconds for blockchain to settle, then sync
          setTimeout(() => {
            syncBalance()
          }, 5000)
        })
        .catch(console.error)
    }
  }, [isConfirmed, txHash])

  const fetchAgent = async (autoSync = false) => {
    if (!address) return
    setLoading(true)
    try {
      // First get agent data
      const res = await fetch(`${BACKEND_URL}/api/agent/me/${address}`)
      const data = await res.json()

      if (data.agent) {
        // Auto sync balance from blockchain on load
        if (autoSync) {
          try {
            const syncRes = await fetch(`${BACKEND_URL}/api/agent/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ownerAddress: address }),
            })
            const syncData = await syncRes.json()
            if (syncData.agent) {
              setAgent(syncData.agent)
              setConfig({
                agentName: syncData.agent.agentName || '',
                personality: syncData.agent.personality || 'newbie',
                customPersonality: syncData.agent.customPersonality || '',
                playStyle: syncData.agent.playStyle || 'strategic',
                autoChat: syncData.agent.autoChat ?? true,
              })
              setLoading(false)
              return
            }
          } catch (syncError) {
            console.error('Auto sync failed:', syncError)
          }
        }

        setAgent(data.agent)
        setConfig({
          agentName: data.agent.agentName || '',
          personality: data.agent.personality || 'newbie',
          customPersonality: data.agent.customPersonality || '',
          playStyle: data.agent.playStyle || 'strategic',
          autoChat: data.agent.autoChat ?? true,
        })
      } else {
        setAgent(null)
      }
    } catch (error) {
      console.error('Error fetching agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const createAgent = async () => {
    if (!address) return
    setCreating(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerAddress: address }),
      })
      const data = await res.json()
      if (data.agent) {
        setAgent(data.agent)
      }
    } catch (error) {
      console.error('Error creating agent:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeposit = async () => {
    if (!agent || !address) return
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) return

    const provider = await getWalletProvider()
    if (!provider) {
      alert('No wallet found! Please install a browser wallet.')
      return
    }

    // Check if on correct network
    if (isWrongNetwork) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${MONAD_CHAIN_ID.toString(16)}` }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${MONAD_CHAIN_ID.toString(16)}`,
                chainName: 'Monad',
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                rpcUrls: ['https://monad-mainnet.drpc.org', 'https://rpc.monad.xyz'],
                blockExplorerUrls: ['https://explorer.monad.xyz'],
              }],
            })
          } catch (addError) {
            console.error('Failed to add chain:', addError)
            return
          }
        } else {
          console.error('Failed to switch chain:', switchError)
          return
        }
      }
      return
    }

    setIsSending(true)
    setIsConfirmed(false)
    setTxHash(null)

    try {
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: agent.agentAddress,
          value: `0x${parseEther(depositAmount).toString(16)}`,
        }],
      })

      setTxHash(hash)
      setIsSending(false)
      setIsConfirming(true)

      // Wait for confirmation
      const publicClient = createPublicClient({
        chain: monad,
        transport: http(),
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setIsConfirming(false)
      setIsConfirmed(true)
    } catch (err: any) {
      console.error('Deposit error:', err)
      alert(`Deposit failed: ${err.message}`)
      setIsSending(false)
      setIsConfirming(false)
    }
  }

  const toggleAgent = async () => {
    if (!agent || !address) return
    setEnabling(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: address,
          enabled: !agent.isEnabled,
        }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else if (data.agent) {
        setAgent(data.agent)
      }
    } catch (error) {
      console.error('Error toggling agent:', error)
    } finally {
      setEnabling(false)
    }
  }

  const saveConfig = async () => {
    if (!agent || !address) return
    setSavingConfig(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: address,
          config: {
            agentName: config.agentName,
            personality: config.personality,
            customPersonality: config.customPersonality,
            playStyle: config.playStyle,
            autoChat: config.autoChat,
          },
        }),
      })
      const data = await res.json()
      if (data.agent) {
        setAgent(data.agent)
        setShowConfig(false)
      }
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setSavingConfig(false)
    }
  }

  const syncBalance = async () => {
    if (!agent || !address) return
    setIsSyncing(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerAddress: address }),
      })
      const data = await res.json()
      if (data.agent) {
        setAgent(data.agent)
      }
    } catch (error) {
      console.error('Error syncing balance:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const fetchTransactions = async () => {
    if (!address) return
    setLoadingTx(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent-transactions/${address}?limit=20`)
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoadingTx(false)
    }
  }

  const handleWithdraw = async (withdrawAll = false) => {
    if (!agent || !address) return
    if (!withdrawAll && (!withdrawAmount || parseFloat(withdrawAmount) <= 0)) return

    setIsWithdrawing(true)
    setWithdrawResult(null)
    try {
      const endpoint = withdrawAll ? 'withdraw-all' : 'withdraw'
      const body = withdrawAll
        ? { ownerAddress: address }
        : { ownerAddress: address, amount: withdrawAmount }

      const res = await fetch(`${BACKEND_URL}/api/agent/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.error) {
        alert(data.error)
      } else {
        if (data.agent) {
          setAgent(data.agent)
        }
        setWithdrawResult({
          txHash: data.txHash,
          amount: data.amount || withdrawAmount,
        })
        setWithdrawAmount('')
      }
    } catch (error) {
      console.error('Error withdrawing:', error)
      alert('Withdraw failed. Please try again.')
    } finally {
      setIsWithdrawing(false)
    }
  }

  const winRate = agent && agent.gamesPlayed > 0
    ? ((agent.gamesWon / agent.gamesPlayed) * 100).toFixed(1)
    : '0.0'

  const pnl = agent
    ? (parseFloat(agent.totalWinnings || '0') - parseFloat(agent.totalLosses || '0')).toFixed(4)
    : '0.0000'

  const pnlPositive = parseFloat(pnl) >= 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">🤖 My Agent</h1>
          <p className="text-gray-400">Your personal auto-playing lobster</p>
        </motion.div>

        {!isConnected ? (
          <motion.div
            className="bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-gray-400 mb-4">Connect your wallet to manage your agent</p>
          </motion.div>
        ) : loading ? (
          <motion.div
            className="bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="animate-spin text-4xl mb-4">🦞</div>
            <p className="text-gray-400">Loading...</p>
          </motion.div>
        ) : !agent ? (
          // Create Agent CTA
          <motion.div
            className="bg-gradient-to-r from-lobster-600/20 to-ocean-600/20 rounded-2xl p-8 border border-lobster-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold mb-2">Create Your Agent</h2>
              <p className="text-gray-400 mb-6">
                Your agent will have its own wallet and can auto-play LobsterPot rounds
                while you sleep! Just deposit some MON and enable it.
              </p>
              <motion.button
                onClick={createAgent}
                disabled={creating}
                className={`px-8 py-3 rounded-xl font-semibold text-lg ${
                  creating
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-lobster-500 to-ocean-500 hover:from-lobster-400 hover:to-ocean-400'
                }`}
                whileHover={creating ? {} : { scale: 1.05 }}
                whileTap={creating ? {} : { scale: 0.95 }}
              >
                {creating ? 'Creating...' : 'Create Agent Wallet'}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          // Agent Dashboard
          <div className="space-y-6">
            {/* Agent Card */}
            <motion.div
              className={`rounded-2xl p-6 border ${
                agent.isEnabled
                  ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-lobster-500 to-ocean-500 flex items-center justify-center text-3xl">
                    {PERSONALITIES.find(p => p.id === agent.personality)?.emoji || '🤖'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {agent.agentName || `Agent-${agent.agentAddress.slice(0, 6)}`}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">{agent.agentAddress}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.isEnabled
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {agent.isEnabled ? '🟢 Active' : '⚪ Inactive'}
                </div>
              </div>

              {/* Agent Address Copy */}
              <div className="bg-slate-900/50 rounded-xl p-3 mb-4">
                <div className="text-xs text-gray-500 mb-1">Agent Wallet Address</div>
                <div className="flex items-center justify-between">
                  <code className="text-sm text-lobster-400">{agent.agentAddress}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(agent.agentAddress)}
                    className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Balance & Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    Current Balance {isSyncing && <span className="text-yellow-400">(syncing...)</span>}
                  </div>
                  <div className="text-2xl font-bold text-lobster-400">
                    {parseFloat(agent.currentBalance || '0').toFixed(4)} MON
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">Total Deposited</div>
                  <div className="text-2xl font-bold">
                    {parseFloat(agent.depositedAmount || '0').toFixed(4)} MON
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Games</div>
                  <div className="font-semibold">{agent.gamesPlayed || 0}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Wins</div>
                  <div className="font-semibold text-green-400">{agent.gamesWon || 0}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Win Rate</div>
                  <div className="font-semibold">{winRate}%</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">P&L</div>
                  <div className={`font-semibold ${pnlPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlPositive ? '+' : ''}{pnl}
                  </div>
                </div>
              </div>

              {/* Agent Skills */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Agent Skills</div>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_SKILLS.map((skill) => {
                    const isEnabled = skill.id === 'auto_play' ? agent.isEnabled : agent.autoChat
                    return (
                      <div
                        key={skill.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isEnabled
                            ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30'
                            : 'bg-slate-900/50 border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{skill.emoji}</span>
                            <span className="font-medium text-sm">{skill.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isEnabled ? 'bg-green-500/30 text-green-400' : 'bg-gray-600/30 text-gray-500'
                          }`}>
                            {isEnabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{skill.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Config Summary */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <div className={`bg-gradient-to-r ${PERSONALITIES.find(p => p.id === agent.personality)?.color || 'from-blue-400 to-cyan-400'} rounded-lg px-3 py-1.5 text-sm font-medium`}>
                  {PERSONALITIES.find(p => p.id === agent.personality)?.emoji} {PERSONALITIES.find(p => p.id === agent.personality)?.name || agent.personality}
                </div>
                {agent.customPersonality && (
                  <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg px-3 py-1.5 text-sm font-medium text-purple-300 border border-purple-500/30">
                    ✨ AI Custom
                  </div>
                )}
                <div className="bg-slate-800/80 rounded-lg px-3 py-1.5 text-sm">
                  {PLAY_STYLES.find(s => s.id === agent.playStyle)?.emoji || '🎯'} {PLAY_STYLES.find(s => s.id === agent.playStyle)?.name || agent.playStyle}
                </div>
              </div>

              {/* Sample Messages Preview */}
              {agent.autoChat && (
                <div className="bg-slate-900/50 rounded-xl p-3 mb-4">
                  {agent.customPersonality ? (
                    <>
                      <div className="flex items-center gap-2 text-xs text-purple-400 mb-2">
                        <span>✨</span>
                        <span>AI-Powered Custom Personality</span>
                      </div>
                      <div className="text-xs text-gray-400 italic line-clamp-2">
                        "{agent.customPersonality}"
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-gray-500 mb-2">Sample Messages ({PERSONALITIES.find(p => p.id === agent.personality)?.name})</div>
                      <div className="space-y-1.5">
                        {PERSONALITIES.find(p => p.id === agent.personality)?.sampleMessages?.slice(0, 2).map((msg, i) => (
                          <div key={i} className="text-sm text-gray-300 italic">"{msg}"</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={toggleAgent}
                  disabled={enabling || parseFloat(agent.currentBalance || '0') < 0.01}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    enabling
                      ? 'bg-gray-600 cursor-not-allowed'
                      : agent.isEnabled
                        ? 'bg-red-500/80 hover:bg-red-500'
                        : parseFloat(agent.currentBalance || '0') < 0.01
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-green-500/80 hover:bg-green-500'
                  }`}
                  whileHover={enabling ? {} : { scale: 1.02 }}
                  whileTap={enabling ? {} : { scale: 0.98 }}
                >
                  {enabling ? 'Processing...' : agent.isEnabled ? 'Disable Agent' : 'Enable Agent'}
                </motion.button>
                <motion.button
                  onClick={() => setShowConfig(true)}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ⚙️
                </motion.button>
              </div>

              {parseFloat(agent.currentBalance || '0') < 0.01 && !agent.isEnabled && (
                <p className="text-xs text-yellow-400 mt-2 text-center">
                  Deposit at least 0.01 MON to enable agent
                </p>
              )}
            </motion.div>

            {/* Deposit Section */}
            <motion.div
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-semibold mb-4">💰 Fund Your Agent</h3>
              <p className="text-sm text-gray-400 mb-4">
                Send MON directly to your agent's wallet. The agent will use these funds to join rounds.
              </p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-lobster-500"
                    placeholder="Amount in MON"
                  />
                </div>
                <motion.button
                  onClick={handleDeposit}
                  disabled={isSending || isConfirming}
                  className={`px-6 py-3 rounded-xl font-medium ${
                    isWrongNetwork
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400'
                      : isSending || isConfirming
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-lobster-500 to-ocean-500 hover:from-lobster-400 hover:to-ocean-400'
                  }`}
                  whileHover={isSending || isConfirming ? {} : { scale: 1.05 }}
                  whileTap={isSending || isConfirming ? {} : { scale: 0.95 }}
                >
                  {isWrongNetwork ? '⚠️ Switch to Monad' : isSending ? 'Sending...' : isConfirming ? 'Confirming...' : 'Deposit'}
                </motion.button>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {['0.01', '0.05', '0.1', '0.5'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDepositAmount(amt)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      depositAmount === amt
                        ? 'bg-lobster-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {amt} MON
                  </button>
                ))}
              </div>

              {isConfirmed && (
                <motion.p
                  className="text-green-400 text-sm mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Deposit successful! Balance will update shortly.
                </motion.p>
              )}
            </motion.div>

            {/* Withdraw Section */}
            <motion.div
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h3 className="font-semibold mb-4">💸 Withdraw Funds</h3>
              <p className="text-sm text-gray-400 mb-4">
                Withdraw MON from your agent's wallet back to your main wallet.
                {agent.isEnabled && (
                  <span className="text-yellow-400 block mt-1">
                    ⚠️ Disable agent before withdrawing
                  </span>
                )}
              </p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="0.001"
                    step="0.001"
                    max={agent.currentBalance || '0'}
                    disabled={agent.isEnabled}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-lobster-500 disabled:opacity-50"
                    placeholder="Amount in MON"
                  />
                </div>
                <motion.button
                  onClick={() => handleWithdraw(false)}
                  disabled={isWithdrawing || agent.isEnabled || !withdrawAmount}
                  className={`px-6 py-3 rounded-xl font-medium ${
                    isWithdrawing || agent.isEnabled || !withdrawAmount
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400'
                  }`}
                  whileHover={isWithdrawing || agent.isEnabled ? {} : { scale: 1.02 }}
                  whileTap={isWithdrawing || agent.isEnabled ? {} : { scale: 0.98 }}
                >
                  {isWithdrawing ? 'Processing...' : 'Withdraw'}
                </motion.button>
              </div>

              {/* Withdraw All Button */}
              <motion.button
                onClick={() => handleWithdraw(true)}
                disabled={isWithdrawing || agent.isEnabled || parseFloat(agent.currentBalance || '0') <= 0}
                className={`w-full py-2 rounded-xl text-sm ${
                  isWithdrawing || agent.isEnabled || parseFloat(agent.currentBalance || '0') <= 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                }`}
                whileTap={isWithdrawing || agent.isEnabled ? {} : { scale: 0.98 }}
              >
                Withdraw All (minus gas)
              </motion.button>

              {withdrawResult && (
                <motion.div
                  className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-green-400 text-sm">
                    ✅ Withdrew {withdrawResult.amount} MON
                  </p>
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${withdrawResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View transaction →
                  </a>
                </motion.div>
              )}
            </motion.div>

            {/* Transaction History */}
            <motion.div
              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">📜 Transaction History</h3>
                <motion.button
                  onClick={() => {
                    setShowHistory(!showHistory)
                    if (!showHistory) fetchTransactions()
                  }}
                  className="text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg"
                  whileTap={{ scale: 0.95 }}
                >
                  {showHistory ? 'Hide' : 'Show'}
                </motion.button>
              </div>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {loadingTx ? (
                      <div className="text-center py-4 text-gray-400">Loading...</div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No transactions yet</div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {tx.type === 'deposit' && '📥'}
                                {tx.type === 'withdraw' && '📤'}
                                {tx.type === 'bet' && '🎲'}
                                {tx.type === 'win' && '🏆'}
                              </span>
                              <div>
                                <div className="font-medium capitalize">{tx.type}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(tx.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${
                                tx.type === 'deposit' || tx.type === 'win'
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }`}>
                                {tx.type === 'deposit' || tx.type === 'win' ? '+' : '-'}
                                {parseFloat(tx.amount).toFixed(4)} MON
                              </div>
                              {tx.txHash && (
                                <a
                                  href={`https://testnet.monadexplorer.com/tx/${tx.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline"
                                >
                                  View tx
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* How it works */}
            <motion.div
              className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h3 className="font-semibold mb-4">❓ How it works</h3>
              <div className="space-y-4">
                {/* Auto-Play */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-lobster-400 mb-1">
                    <span>🎮</span> Auto-Play Skill
                  </div>
                  <ul className="space-y-1 text-sm text-gray-400 ml-6">
                    <li>• Automatically joins LobsterPot rounds when enabled</li>
                    <li>• Uses 0.01 MON per round (standard bet)</li>
                    <li>• Play style affects when/how it joins</li>
                    <li>• Winnings are added to agent balance</li>
                  </ul>
                </div>

                {/* Auto-Chat */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-ocean-400 mb-1">
                    <span>💬</span> Auto-Chat Skill
                  </div>
                  <ul className="space-y-1 text-sm text-gray-400 ml-6">
                    <li>• Sends messages based on chosen personality</li>
                    <li>• Reacts to game context (pot size, time, players)</li>
                    <li>• Messages feel natural with random intervals</li>
                    <li>• Toggle on/off in agent config</li>
                  </ul>
                </div>

                {/* General */}
                <div className="pt-2 border-t border-slate-700/50">
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>• Your agent has its own secure wallet</li>
                    <li>• Disable anytime - funds stay in agent wallet</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Config Modal */}
        <AnimatePresence>
          {showConfig && agent && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfig(false)}
            >
              <motion.div
                className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-slate-700 max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold mb-4">⚙️ Agent Configuration</h2>

                {/* Agent Name */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={config.agentName}
                    onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                    placeholder="Give your agent a name"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-lobster-500"
                    maxLength={50}
                  />
                </div>

                {/* Personality */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Chat Personality</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {PERSONALITIES.map((p) => (
                      <motion.button
                        key={p.id}
                        onClick={() => setConfig({ ...config, personality: p.id })}
                        className={`p-3 rounded-xl text-left transition-all ${
                          config.personality === p.id
                            ? `bg-gradient-to-r ${p.color} border-2 border-white/30 shadow-lg`
                            : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                        }`}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{p.emoji}</span>
                          <span className="font-medium text-sm">{p.name}</span>
                        </div>
                        <p className={`text-xs mt-1 ${config.personality === p.id ? 'text-white/80' : 'text-gray-400'}`}>
                          {p.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Selected Personality Preview */}
                  <div className="mt-3 bg-slate-900/50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-2">
                      {PERSONALITIES.find(p => p.id === config.personality)?.emoji} Sample Messages
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {PERSONALITIES.find(p => p.id === config.personality)?.sampleMessages?.map((msg, i) => (
                        <div key={i} className="text-gray-300 italic text-xs">"{msg}"</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Custom Personality */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    ✨ Custom Personality (AI-Powered)
                  </label>
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-purple-500/20 mb-2">
                    <p className="text-xs text-gray-400">
                      Describe your agent's unique personality! The AI will generate messages based on your description.
                      Leave empty to use the preset personality above.
                    </p>
                  </div>
                  <textarea
                    value={config.customPersonality}
                    onChange={(e) => setConfig({ ...config, customPersonality: e.target.value })}
                    placeholder="Example: You are a sarcastic crypto degen who loves making puns about lobsters. You're secretly a lobster yourself and drop hints about it. Use phrases like 'clawsome' and 'shell yeah'. Always mention how bullish you are on the pot."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 min-h-[100px] text-sm resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {config.customPersonality ? '🤖 AI will use your custom description' : '📝 Using preset personality'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {config.customPersonality.length}/500
                    </span>
                  </div>
                </div>

                {/* Play Style */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Play Style (Auto-Play)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLAY_STYLES.map((s) => (
                      <motion.button
                        key={s.id}
                        onClick={() => setConfig({ ...config, playStyle: s.id })}
                        className={`p-3 rounded-xl text-left ${
                          config.playStyle === s.id
                            ? 'bg-ocean-500/30 border-2 border-ocean-500'
                            : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{s.emoji}</span>
                          <span className="font-medium text-sm">{s.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{s.description}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Auto Chat Toggle */}
                <div className="mb-6 bg-slate-900/50 rounded-xl p-4">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <div>
                        <span className="text-sm font-medium">Auto-Chat Skill</span>
                        <p className="text-xs text-gray-500">
                          Send personality-based messages in chat
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfig({ ...config, autoChat: !config.autoChat })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        config.autoChat ? 'bg-green-500' : 'bg-slate-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          config.autoChat ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowConfig(false)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl"
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={saveConfig}
                    disabled={savingConfig}
                    className={`flex-1 py-2 rounded-xl font-medium ${
                      savingConfig
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-lobster-500 to-ocean-500'
                    }`}
                    whileTap={savingConfig ? {} : { scale: 0.98 }}
                  >
                    {savingConfig ? 'Saving...' : 'Save'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
