'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PMonNotification {
  id: string
  action: string
  points: number
  message: string
  emoji: string
}

const ACTION_CONFIG: Record<string, { emoji: string; message: string; color: string }> = {
  join_pot: { emoji: '🦞', message: 'Joined the pot!', color: 'from-lobster-500 to-lobster-600' },
  first_join: { emoji: '🎯', message: 'First to join!', color: 'from-yellow-500 to-orange-500' },
  lucky_number: { emoji: '🍀', message: 'Lucky number!', color: 'from-green-500 to-emerald-500' },
  win_round: { emoji: '🏆', message: 'You won!', color: 'from-yellow-400 to-amber-500' },
  streak_win: { emoji: '🔥', message: 'Win streak!', color: 'from-orange-500 to-red-500' },
  chat_message: { emoji: '💬', message: 'Chat bonus', color: 'from-blue-500 to-cyan-500' },
  daily_login: { emoji: '📅', message: 'Daily bonus!', color: 'from-purple-500 to-pink-500' },
}

interface PMonNotificationToastProps {
  notifications: PMonNotification[]
  onDismiss: (id: string) => void
}

export function PMonNotificationToast({ notifications, onDismiss }: PMonNotificationToastProps) {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => {
          const config = ACTION_CONFIG[notif.action] || ACTION_CONFIG.join_pot

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`bg-gradient-to-r ${config.color} rounded-xl p-4 shadow-lg backdrop-blur-sm border border-white/20 min-w-[250px]`}
              onClick={() => onDismiss(notif.id)}
            >
              <div className="flex items-center gap-3">
                <motion.span
                  className="text-3xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: 2, duration: 0.3 }}
                >
                  {config.emoji}
                </motion.span>
                <div className="flex-1">
                  <div className="font-semibold text-white">{config.message}</div>
                  <motion.div
                    className="text-xl font-bold text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    +{notif.points} pMON
                  </motion.div>
                </div>
                <motion.div
                  className="text-white/60 text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  tap to dismiss
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Hook to manage pMON notifications
export function usePMonNotifications() {
  const [notifications, setNotifications] = useState<PMonNotification[]>([])

  const addNotification = (action: string, points: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const config = ACTION_CONFIG[action] || ACTION_CONFIG.join_pot

    setNotifications((prev) => [
      ...prev,
      { id, action, points, message: config.message, emoji: config.emoji },
    ])

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      dismissNotification(id)
    }, 4000)
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return { notifications, addNotification, dismissNotification }
}

export default PMonNotificationToast
