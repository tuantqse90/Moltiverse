'use client'

import { motion } from 'framer-motion'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationSettings() {
  const { isSupported, isEnabled, permission, requestPermission } = useNotifications()

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        Notifications not supported in this browser
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">Push Notifications</div>
        <div className="text-xs text-gray-500">
          Get notified when you win
        </div>
      </div>

      {isEnabled ? (
        <div className="flex items-center gap-2 text-green-400">
          <span className="text-lg">🔔</span>
          <span className="text-sm">Enabled</span>
        </div>
      ) : permission === 'denied' ? (
        <div className="flex items-center gap-2 text-red-400">
          <span className="text-lg">🔕</span>
          <span className="text-sm">Blocked</span>
        </div>
      ) : (
        <motion.button
          onClick={requestPermission}
          className="px-3 py-1.5 bg-lobster-500 hover:bg-lobster-400 rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Enable
        </motion.button>
      )}
    </div>
  )
}
