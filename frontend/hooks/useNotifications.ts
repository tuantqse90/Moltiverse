'use client'

import { useState, useEffect, useCallback } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [isSupported])

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return null

    try {
      const notification = new Notification(title, {
        icon: '/lobster-icon.png',
        badge: '/lobster-icon.png',
        ...options,
      })

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000)

      return notification
    } catch (error) {
      console.error('Error showing notification:', error)
      return null
    }
  }, [isSupported, permission])

  const notifyWin = useCallback((winner: string, amount: string, round: number) => {
    return notify(`🎉 Round ${round} Winner!`, {
      body: `${winner.slice(0, 8)}... won ${amount} MON!`,
      tag: `win-${round}`,
    })
  }, [notify])

  const notifyAgentWin = useCallback((agentName: string, amount: string, round: number) => {
    return notify(`🏆 Your Agent Won!`, {
      body: `${agentName} won ${amount} MON in round ${round}!`,
      tag: `agent-win-${round}`,
      requireInteraction: true,
    })
  }, [notify])

  const notifyAchievement = useCallback((achievementName: string, emoji: string) => {
    return notify(`${emoji} Achievement Unlocked!`, {
      body: achievementName,
      tag: 'achievement',
    })
  }, [notify])

  const notifyJackpot = useCallback((amount: number) => {
    return notify(`🎰 JACKPOT!`, {
      body: `You won ${amount} pMON!`,
      tag: 'jackpot',
      requireInteraction: true,
    })
  }, [notify])

  return {
    isSupported,
    permission,
    isEnabled: permission === 'granted',
    requestPermission,
    notify,
    notifyWin,
    notifyAgentWin,
    notifyAchievement,
    notifyJackpot,
  }
}
