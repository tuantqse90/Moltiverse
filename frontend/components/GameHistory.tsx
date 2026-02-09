'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface GameRound {
  id: number
  roundNumber: number
  winnerAddress: string | null
  prizeAmount: string | null
  participantCount: number | null
  endedAt: string | null
}

interface GameHistoryProps {
  currentAddress?: string
}

export function GameHistory({ currentAddress }: GameHistoryProps) {
  const [rounds, setRounds] = useState<GameRound[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchHistory = async (reset = false) => {
    setIsLoading(true)
    try {
      const newOffset = reset ? 0 : offset
      const res = await fetch(`${BACKEND_URL}/api/game-history?limit=10&offset=${newOffset}`)
      const data = await res.json()

      if (data.success) {
        if (reset) {
          setRounds(data.data)
        } else {
          setRounds(prev => [...prev, ...data.data])
        }
        setHasMore(data.pagination.hasMore)
        setOffset(newOffset + data.data.length)
      }
    } catch (error) {
      console.error('Error fetching game history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isExpanded && rounds.length === 0) {
      fetchHistory(true)
    }
  }, [isExpanded])

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isUserWinner = (winnerAddress: string | null) => {
    if (!winnerAddress || !currentAddress) return false
    return winnerAddress.toLowerCase() === currentAddress.toLowerCase()
  }

  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl backdrop-blur-sm border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 md:p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg md:text-xl">📜</span>
          <h3 className="font-semibold text-sm md:text-base">Game History</h3>
          {rounds.length > 0 && (
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-gray-400">
              {rounds.length} rounds
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-gray-400 text-sm"
        >
          ▼
        </motion.span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {isLoading && rounds.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-lobster-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Loading...
                </div>
              ) : rounds.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl mb-2 block">🦞</span>
                  <p>No game history yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {rounds.map((round) => (
                    <motion.div
                      key={round.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 hover:bg-slate-700/30 transition-colors ${
                        isUserWinner(round.winnerAddress) ? 'bg-lobster-600/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Round info */}
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <div className="text-xs text-gray-500">Round</div>
                            <div className="font-bold text-lobster-400">#{round.roundNumber}</div>
                          </div>

                          <div className="h-8 w-px bg-slate-600" />

                          {/* Winner */}
                          <div>
                            {round.winnerAddress ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">🏆</span>
                                <span className={`text-sm font-mono ${
                                  isUserWinner(round.winnerAddress) ? 'text-lobster-400 font-bold' : 'text-gray-300'
                                }`}>
                                  {isUserWinner(round.winnerAddress) ? 'You!' : shortenAddress(round.winnerAddress)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">❌</span>
                                <span className="text-sm text-gray-500">No winner</span>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {round.endedAt && formatDate(round.endedAt)}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-xs text-gray-500">Pot</div>
                            <div className="font-semibold text-ocean-400">
                              {parseFloat(round.prizeAmount || '0').toFixed(2)} MON
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Players</div>
                            <div className="font-semibold text-gray-300">
                              {round.participantCount || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Load more */}
                  {hasMore && (
                    <div className="p-3 text-center">
                      <button
                        onClick={() => fetchHistory()}
                        disabled={isLoading}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
