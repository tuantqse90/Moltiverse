'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { PotTimer } from '@/components/PotTimer'
import { ParticipantList } from '@/components/ParticipantList'
import { WinnerAnnouncement } from '@/components/WinnerAnnouncement'
import { NoWinnerAnnouncement } from '@/components/NoWinnerAnnouncement'
import { LobsterChat } from '@/components/LobsterChat'
import { GameHistory } from '@/components/GameHistory'
import { SettingsPanel } from '@/components/SettingsPanel'
import { JoinButton } from '@/components/JoinButton'
import { Navigation } from '@/components/Navigation'
import { PMonNotificationToast, usePMonNotifications } from '@/components/PMonNotification'
import { NetworkError } from '@/components/ErrorBoundary'
import { TimerSkeleton, CardSkeleton } from '@/components/Skeleton'
import { useSocket } from '@/hooks/useSocket'
import { useLobsterPot } from '@/hooks/useLobsterPot'
import { useWallet } from '@/hooks/useWallet'
import { useSound } from '@/hooks/useSound'
import { useNotifications } from '@/hooks/useNotifications'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useToast } from '@/components/Toast'

// Wrapper component for useSearchParams (needs Suspense in Next.js 15)
function ReferralHandler({ onReferral }: { onReferral: (code: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      onReferral(refCode)
    }
  }, [searchParams, onReferral])

  return null
}

interface PotData {
  round: number
  timeRemaining: number
  potAmount: string
  participantCount: number
  participants: string[]
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function Home() {
  // Shared wallet state
  const { address, isConnected } = useWallet()

  const { socket, isConnected: socketConnected, potData: socketPotData, countdown, lastWinner, recentJoin, noWinner } = useSocket()
  const {
    joinPot,
    isPending,
    isConfirming,
    isSuccess,
    entryFee,
  } = useLobsterPot()

  const [mounted, setMounted] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [apiData, setApiData] = useState<PotData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isAgentMode, setIsAgentMode] = useState(false)
  const [lastRound, setLastRound] = useState<number>(0)
  const [showRoundEnd, setShowRoundEnd] = useState<{ type: 'winner' | 'noWinner', data: any } | null>(null)
  const [userAgentAddress, setUserAgentAddress] = useState<string | undefined>(undefined)

  // Network status
  const { isOnline } = useNetworkStatus()

  // pMON notifications
  const { notifications, addNotification, dismissNotification } = usePMonNotifications()

  // Sound effects
  const { play: playSound } = useSound()

  // Push notifications
  const { notifyWin, notifyAgentWin, isEnabled: notificationsEnabled } = useNotifications()

  // Toast notifications
  const toast = useToast()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user's agent address
  useEffect(() => {
    if (!address) {
      setUserAgentAddress(undefined)
      return
    }

    fetch(`${BACKEND_URL}/api/agent/me/${address}`)
      .then(res => res.json())
      .then(data => {
        if (data.agent?.agentAddress) {
          setUserAgentAddress(data.agent.agentAddress)
        }
      })
      .catch(() => {
        // Ignore - user may not have an agent
      })
  }, [address])

  // Handle referral code from URL
  const handleReferral = (refCode: string) => {
    if (refCode && address) {
      // Apply referral code
      fetch(`${BACKEND_URL}/api/referrals/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refereeAddress: address, code: refCode }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            toast.success('Referral Applied!', data.message)
            // Clear the ref param from URL
            window.history.replaceState({}, '', '/')
          } else if (data.message !== 'Already referred by someone') {
            toast.info('Referral', data.message)
          }
        })
        .catch(err => console.error('Error applying referral:', err))
    }
  }

  // Play sound on winner announcement
  useEffect(() => {
    if (lastWinner || showRoundEnd?.type === 'winner') {
      playSound('win')
    }
  }, [lastWinner, showRoundEnd, playSound])

  // Play sound on recent join
  useEffect(() => {
    if (recentJoin) {
      playSound('join')
    }
  }, [recentJoin, playSound])

  // Listen for pMON earned events
  useEffect(() => {
    if (!socket || !address) return

    const handlePMonEarned = (data: { address: string; action: string; points: number; newBalance: number; streakCount?: number }) => {
      // Only show notification for current user
      if (data.address.toLowerCase() === address.toLowerCase()) {
        addNotification(data.action, data.points)
      }
    }

    socket.on('pmon:earned', handlePMonEarned)

    return () => {
      socket.off('pmon:earned', handlePMonEarned)
    }
  }, [socket, address, addNotification])

  // Fetch data from API
  const fetchPotData = async () => {
    try {
      setLoadError(null)
      const res = await fetch(`${BACKEND_URL}/api/pot/current`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      if (json.success) {
        setApiData({
          round: json.data.round,
          timeRemaining: json.data.timeRemaining,
          potAmount: json.data.potAmount,
          participantCount: json.data.participantCount,
          participants: json.data.participants || [],
        })
        setLoadError(null)
      } else {
        throw new Error(json.message || 'Failed to load data')
      }
    } catch (error) {
      console.error('Failed to fetch pot data:', error)
      if (!apiData) {
        setLoadError(error instanceof Error ? error.message : 'Connection failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchPotData()
    const interval = setInterval(fetchPotData, 3000)
    return () => clearInterval(interval)
  }, [])

  // Refetch on successful join
  useEffect(() => {
    if (isSuccess) {
      fetchPotData()
    }
  }, [isSuccess])

  // Check if user has joined
  useEffect(() => {
    if (address && apiData?.participants) {
      const joined = apiData.participants.some(
        (p) => p.toLowerCase() === address.toLowerCase()
      )
      setHasJoined(joined)
    }
  }, [address, apiData?.participants])

  // Detect round change and show announcement
  useEffect(() => {
    if (apiData && apiData.round > lastRound && lastRound > 0) {
      // Round changed! Fetch last round result
      fetch(`${BACKEND_URL}/api/pot/lastRound`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            const data = json.data
            if (data.winner && data.winner !== '0x0000000000000000000000000000000000000000') {
              // Has winner
              setShowRoundEnd({
                type: 'winner',
                data: { winner: data.winner, amount: data.prize, round: data.round, participantCount: data.participantCount }
              })

              // Check if current user won
              if (address && data.winner.toLowerCase() === address.toLowerCase()) {
                toast.success('🎉 You Won!', `${data.prize} MON in round ${data.round}`)
                notifyWin(data.winner, data.prize, data.round)
              } else if (notificationsEnabled) {
                // Notify about winner (if notifications enabled)
                notifyWin(data.winner, data.prize, data.round)
              }
            } else {
              // No winner (refund)
              setShowRoundEnd({
                type: 'noWinner',
                data: { round: data.round, participantCount: data.participantCount || 1 }
              })
            }
            // Auto-hide after 8 seconds
            setTimeout(() => setShowRoundEnd(null), 8000)
          }
        })
        .catch(err => console.error('Failed to fetch last round:', err))
    }
    if (apiData) {
      setLastRound(apiData.round)
    }
  }, [apiData?.round, lastRound, address, toast, notifyWin, notificationsEnabled])

  // Use socket countdown if available, fallback to API data
  const displayData = countdown || socketPotData || apiData

  // Play countdown sound in last 10 seconds
  const timeRemaining = displayData?.timeRemaining ?? 0
  useEffect(() => {
    if (timeRemaining > 0 && timeRemaining <= 10) {
      playSound('countdown')
    }
  }, [timeRemaining, playSound])

  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Handle referral code from URL - wrapped in Suspense for Next.js 15 */}
      <Suspense fallback={null}>
        <ReferralHandler onReferral={handleReferral} />
      </Suspense>

      <div className="p-4 md:p-8">
      {/* Connection status */}
      <div className="flex justify-center mb-4">
        <div className={`flex items-center gap-2 text-sm ${apiData ? 'text-green-400' : 'text-yellow-400'}`}>
          <span className={`w-2 h-2 rounded-full ${apiData ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          {apiData ? (socketConnected ? 'Live' : 'Connected') : 'Connecting...'}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto">
        {/* Timer section */}
        <motion.section
          className="bg-slate-800/50 rounded-xl md:rounded-2xl p-4 md:p-8 mb-4 md:mb-8 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {displayData ? (
            <>
              <div className="text-center mb-2 text-gray-400">
                Round #{displayData.round}
              </div>
              <PotTimer
                timeRemaining={displayData.timeRemaining}
                potAmount={displayData.potAmount}
                participantCount={displayData.participantCount}
              />
            </>
          ) : isLoading ? (
            <TimerSkeleton />
          ) : loadError || !isOnline ? (
            <NetworkError onRetry={fetchPotData} />
          ) : (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="text-6xl mb-4"
              >
                🦞
              </motion.div>
              <p className="text-gray-400">Connecting to pot...</p>
            </div>
          )}
        </motion.section>

        {/* Join button */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isAgentMode && !hasJoined && (
            <motion.div
              className="mb-4 p-3 bg-ocean-600/20 border border-ocean-500 rounded-xl flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-sm font-medium text-ocean-300">Agent Mode Active</p>
                <p className="text-xs text-gray-400">AI will auto-join when conditions are right</p>
              </div>
              <span className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </motion.div>
          )}
          <JoinButton
            onJoin={joinPot}
            isPending={isPending}
            isConfirming={isConfirming}
            hasJoined={hasJoined}
            entryFee={entryFee}
          />
        </motion.section>

        {/* Recent join notification */}
        {recentJoin && (
          <motion.div
            className="mb-4 p-4 bg-ocean-600/20 border border-ocean-500 rounded-xl text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            🦞 <span className="font-mono">{recentJoin.agent.slice(0, 8)}...</span> just jumped in!
          </motion.div>
        )}

        {/* Participants */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ParticipantList
            participants={apiData?.participants || []}
            currentAddress={address}
          />
        </motion.section>

        {/* Chat */}
        <motion.section
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <LobsterChat socket={socket} currentAddress={address} userAgentAddress={userAgentAddress} />
        </motion.section>

        {/* Game History */}
        <motion.section
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GameHistory currentAddress={address} />
        </motion.section>

        {/* How it works */}
        <motion.section
          className="mt-8 bg-slate-800/30 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold mb-4">How it works</h3>
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div className="p-4">
              <div className="text-3xl mb-2">1️⃣</div>
              <p className="text-gray-300">Throw 0.01 MON into the pot</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">⏱️</div>
              <p className="text-gray-300">Wait for the 10-min timer</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🎲</div>
              <p className="text-gray-300">Random winner selected</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🦞</div>
              <p className="text-gray-300">Winner gets boiled (wins)!</p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Winner announcement overlay */}
      {(lastWinner || showRoundEnd?.type === 'winner') && (
        <WinnerAnnouncement
          winner={lastWinner?.winner || showRoundEnd?.data?.winner}
          amount={lastWinner?.amount || showRoundEnd?.data?.amount}
          round={lastWinner?.round || showRoundEnd?.data?.round}
          isVisible={true}
        />
      )}

      {/* No winner announcement overlay */}
      {(noWinner || showRoundEnd?.type === 'noWinner') && (
        <NoWinnerAnnouncement
          round={noWinner?.round || showRoundEnd?.data?.round}
          participantCount={noWinner?.participantCount || showRoundEnd?.data?.participantCount}
          isVisible={true}
        />
      )}

      {/* Footer */}
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Built for Monad Hackathon | Let's get boiled! 🦞</p>
      </footer>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isAgentMode={isAgentMode}
        onAgentModeChange={setIsAgentMode}
      />

      {/* pMON Notifications */}
      <PMonNotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </main>
  )
}
