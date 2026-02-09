'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface PotUpdate {
  round: number
  startTime: number
  endTime: number
  potAmount: string
  participantCount: number
  isEnded: boolean
  timeRemaining: number
}

interface CountdownData {
  round: number
  timeRemaining: number
  potAmount: string
  participantCount: number
}

interface WinnerData {
  winner: string
  amount: string
  round: number
  participantCount: number
}

interface JoinedData {
  agent: string
  round: number
  potTotal: string
}

interface NoWinnerData {
  round: number
  participantCount: number
  message: string
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [potData, setPotData] = useState<PotUpdate | null>(null)
  const [countdown, setCountdown] = useState<CountdownData | null>(null)
  const [lastWinner, setLastWinner] = useState<WinnerData | null>(null)
  const [recentJoin, setRecentJoin] = useState<JoinedData | null>(null)
  const [noWinner, setNoWinner] = useState<NoWinnerData | null>(null)

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    const newSocket = io(socketUrl)

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    })

    newSocket.on('pot:update', (data: PotUpdate) => {
      setPotData(data)
    })

    newSocket.on('pot:countdown', (data: CountdownData) => {
      setCountdown(data)
    })

    newSocket.on('pot:winner', (data: WinnerData) => {
      setLastWinner(data)
      // Clear after 10 seconds
      setTimeout(() => setLastWinner(null), 10000)
    })

    newSocket.on('pot:joined', (data: JoinedData) => {
      setRecentJoin(data)
      // Clear after 3 seconds
      setTimeout(() => setRecentJoin(null), 3000)
    })

    newSocket.on('pot:noWinner', (data: NoWinnerData) => {
      setNoWinner(data)
      // Clear after 5 seconds
      setTimeout(() => setNoWinner(null), 5000)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  return {
    socket,
    isConnected,
    potData,
    countdown,
    lastWinner,
    recentJoin,
    noWinner,
  }
}
