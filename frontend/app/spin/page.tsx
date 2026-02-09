'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { WalletButton } from '@/components/WalletButton'
import { Navigation } from '@/components/Navigation'
import { useSound } from '@/hooks/useSound'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface SpinPrize {
  id: string
  name: string
  emoji: string
  type: 'pmon' | 'date_token' | 'nothing' | 'jackpot'
  value: number
  probability: number
  color: string
}

interface SpinResult {
  prize: SpinPrize
  prizeIndex: number
  newPmonBalance: number
  isJackpot: boolean
}

export default function SpinPage() {
  const { address, isConnected } = useWallet()
  const { play: playSound } = useSound()
  const [mounted, setMounted] = useState(false)
  const [prizes, setPrizes] = useState<SpinPrize[]>([])
  const [spinCost, setSpinCost] = useState(100)
  const [balance, setBalance] = useState(0)
  const [ownerBalance, setOwnerBalance] = useState(0)
  const [agentBalance, setAgentBalance] = useState(0)
  const [canSpin, setCanSpin] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchConfig()
  }, [])

  useEffect(() => {
    if (address) {
      fetchStats()
    }
  }, [address])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(timer)
    } else if (cooldown === 0 && balance >= spinCost) {
      setCanSpin(true)
    }
  }, [cooldown, balance, spinCost])

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spin/config`)
      const data = await res.json()
      if (data.success) {
        setPrizes(data.data.prizes)
        setSpinCost(data.data.cost)
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
    }
  }

  const fetchStats = async () => {
    if (!address) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/spin/stats/${address}`)
      const data = await res.json()
      if (data.success) {
        setBalance(data.data.balance)
        setOwnerBalance(data.data.ownerBalance || data.data.balance)
        setAgentBalance(data.data.agentBalance || 0)
        setCanSpin(data.data.canSpin)
        setCooldown(data.data.cooldownRemaining)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleSpin = async () => {
    if (!address || !canSpin || isSpinning) return

    setIsSpinning(true)
    setShowResult(false)
    setResult(null)
    playSound('spin')

    try {
      const res = await fetch(`${BACKEND_URL}/api/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      const data = await res.json()

      if (data.success) {
        const spinResult = data.data as SpinResult

        // Calculate rotation - spin multiple times + land on prize
        const prizeAngle = (360 / prizes.length) * spinResult.prizeIndex
        const spins = 5 + Math.random() * 3 // 5-8 full rotations
        const targetRotation = rotation + (spins * 360) + (360 - prizeAngle) + (180 / prizes.length)

        setRotation(targetRotation)

        // Show result after spin completes
        setTimeout(() => {
          setResult(spinResult)
          setShowResult(true)
          setIsSpinning(false)
          setBalance(spinResult.newPmonBalance)
          setCooldown(5)
          setCanSpin(false)

          if (spinResult.isJackpot) {
            playSound('spinWin')
          } else if (spinResult.prize.type !== 'nothing') {
            playSound('win')
          } else {
            playSound('error')
          }
        }, 4000)
      } else {
        setIsSpinning(false)
        alert(data.error)
      }
    } catch (err) {
      console.error('Spin failed:', err)
      setIsSpinning(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2">
              <span>🎰</span> Lucky Spin
            </h1>
            <p className="text-gray-400">Spend pMON to win big prizes!</p>
          </div>

          {!isConnected ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
              <span className="text-6xl mb-4 block">🎰</span>
              <h2 className="text-xl font-semibold mb-4">Connect to Spin</h2>
              <p className="text-gray-400 mb-6">Connect your wallet to try your luck!</p>
              <WalletButton />
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Wheel Section */}
              <div className="flex flex-col items-center">
                {/* Balance Display */}
                <div className="bg-slate-800/50 rounded-xl px-6 py-3 mb-6 border border-slate-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-400 text-sm">Total: </span>
                    <span className="text-xl font-bold text-yellow-400">{balance} pMON</span>
                  </div>
                  {agentBalance > 0 && (
                    <div className="flex items-center justify-center gap-3 text-xs text-gray-500 mt-1">
                      <span>👤 {ownerBalance}</span>
                      <span>+</span>
                      <span>🤖 {agentBalance}</span>
                    </div>
                  )}
                </div>

                {/* Wheel */}
                <div className="relative w-80 h-80">
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-yellow-400 drop-shadow-lg" />
                  </div>

                  {/* Wheel Container */}
                  <div className="relative w-full h-full">
                    <motion.div
                      className="w-full h-full rounded-full border-4 border-yellow-400 shadow-2xl overflow-hidden"
                      style={{
                        background: `conic-gradient(${prizes.map((p, i) =>
                          `${p.color} ${(i / prizes.length) * 100}% ${((i + 1) / prizes.length) * 100}%`
                        ).join(', ')})`,
                      }}
                      animate={{ rotate: rotation }}
                      transition={{
                        duration: 4,
                        ease: [0.2, 0.8, 0.2, 1], // Custom easing for realistic spin
                      }}
                    >
                      {/* Prize Labels */}
                      {prizes.map((prize, i) => {
                        const angle = ((i + 0.5) / prizes.length) * 360
                        return (
                          <div
                            key={prize.id}
                            className="absolute left-1/2 top-1/2 origin-left"
                            style={{
                              transform: `rotate(${angle}deg) translateX(30px)`,
                              width: '110px',
                            }}
                          >
                            <span className="text-2xl">{prize.emoji}</span>
                          </div>
                        )
                      })}
                    </motion.div>

                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-slate-800 border-4 border-yellow-400 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🦞</span>
                    </div>
                  </div>
                </div>

                {/* Spin Button */}
                <motion.button
                  onClick={handleSpin}
                  disabled={!canSpin || isSpinning}
                  className={`mt-6 px-8 py-4 rounded-xl text-xl font-bold transition-all ${
                    canSpin && !isSpinning
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black'
                      : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                  }`}
                  whileHover={canSpin && !isSpinning ? { scale: 1.05 } : {}}
                  whileTap={canSpin && !isSpinning ? { scale: 0.95 } : {}}
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        🎰
                      </motion.span>
                      Spinning...
                    </span>
                  ) : cooldown > 0 ? (
                    `Wait ${cooldown}s...`
                  ) : balance < spinCost ? (
                    `Need ${spinCost} pMON`
                  ) : (
                    `SPIN (${spinCost} pMON)`
                  )}
                </motion.button>
              </div>

              {/* Prizes List */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>🎁</span> Prizes
                </h2>

                <div className="space-y-2">
                  {prizes.map((prize) => (
                    <div
                      key={prize.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: prize.color + '20' }}
                    >
                      <span className="text-2xl">{prize.emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium">{prize.name}</p>
                        <p className="text-xs text-gray-400">
                          {prize.type === 'pmon' && 'Points reward'}
                          {prize.type === 'date_token' && 'Use for dating'}
                          {prize.type === 'nothing' && 'Better luck next time'}
                          {prize.type === 'jackpot' && 'MEGA PRIZE!'}
                        </p>
                      </div>
                      {prize.type === 'jackpot' && (
                        <motion.span
                          className="text-yellow-400 text-xs font-bold"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          RARE!
                        </motion.span>
                      )}
                    </div>
                  ))}
                </div>

                {/* How it works */}
                <div className="mt-6 pt-4 border-t border-slate-600">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span>💡</span> How it works
                  </h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Each spin costs {spinCost} pMON</li>
                    <li>• Win pMON, Date Tokens, or hit the JACKPOT!</li>
                    <li>• 5 second cooldown between spins</li>
                    <li>• Earn pMON by playing the lottery</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Result Modal */}
        <AnimatePresence>
          {showResult && result && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/70 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResult(false)}
              />
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className={`rounded-2xl p-8 text-center max-w-sm w-full border-2 ${
                    result.isJackpot
                      ? 'bg-gradient-to-br from-yellow-600 to-orange-600 border-yellow-400'
                      : result.prize.type !== 'nothing'
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400'
                      : 'bg-slate-800 border-slate-600'
                  }`}
                  initial={{ scale: 0.8, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 50 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    className="text-7xl mb-4"
                    animate={result.isJackpot ? {
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 10, 0],
                    } : {}}
                    transition={{ repeat: result.isJackpot ? Infinity : 0, duration: 0.5 }}
                  >
                    {result.prize.emoji}
                  </motion.div>

                  <h2 className={`text-2xl font-bold mb-2 ${
                    result.isJackpot ? 'text-yellow-200' : ''
                  }`}>
                    {result.isJackpot ? 'JACKPOT!!!' :
                     result.prize.type !== 'nothing' ? 'You Won!' : 'Try Again!'}
                  </h2>

                  <p className="text-xl mb-4">{result.prize.name}</p>

                  {result.prize.type !== 'nothing' && (
                    <p className="text-sm opacity-80">
                      {result.prize.type === 'pmon' || result.prize.type === 'jackpot'
                        ? `+${result.prize.value} pMON added to your balance`
                        : `+${result.prize.value} Date Token awarded!`}
                    </p>
                  )}

                  <motion.button
                    onClick={() => setShowResult(false)}
                    className="mt-6 bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {result.prize.type === 'nothing' ? 'Try Again' : 'Awesome!'}
                  </motion.button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
