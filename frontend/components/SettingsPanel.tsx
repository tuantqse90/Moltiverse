'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSound } from '@/hooks/useSound'
import { useTheme } from '@/hooks/useTheme'
import { NotificationSettings } from './NotificationSettings'

interface SettingsPanelProps {
  isAgentMode: boolean
  onAgentModeChange: (enabled: boolean) => void
}

export function SettingsPanel({ isAgentMode, onAgentModeChange }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isMuted, toggleMute, play } = useSound()
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <>
      {/* Settings Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-slate-800 hover:bg-slate-700 p-3 rounded-full shadow-lg border border-slate-700 z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="text-xl">⚙️</span>
      </motion.button>

      {/* Settings Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 rounded-2xl p-6 w-full max-w-md z-50 border border-slate-700"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>⚙️</span> Settings
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                {/* Theme Toggle */}
                <div className="bg-slate-700/50 dark:bg-slate-700/50 light:bg-white/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
                      <div>
                        <h3 className="font-semibold">Theme</h3>
                        <p className="text-sm text-gray-400">
                          {isDark ? 'Dark mode' : 'Light mode'}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={toggleTheme}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        isDark ? 'bg-slate-600' : 'bg-ocean-500'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-xs"
                        animate={{ left: isDark ? '0.25rem' : '1.75rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        {isDark ? '🌙' : '☀️'}
                      </motion.div>
                    </motion.button>
                  </div>
                </div>

                {/* Sound Toggle */}
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{isMuted ? '🔇' : '🔊'}</span>
                      <div>
                        <h3 className="font-semibold">Sound Effects</h3>
                        <p className="text-sm text-gray-400">
                          Hear sounds for wins, joins, and more
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => {
                        toggleMute()
                        if (isMuted) {
                          setTimeout(() => play('click'), 50)
                        }
                      }}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        !isMuted ? 'bg-lobster-600' : 'bg-slate-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                        animate={{ left: !isMuted ? '1.75rem' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>

                {/* Agent Mode Toggle */}
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🤖</span>
                      <div>
                        <h3 className="font-semibold">Agent Mode</h3>
                        <p className="text-sm text-gray-400">
                          Let AI play automatically for you
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => onAgentModeChange(!isAgentMode)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        isAgentMode ? 'bg-lobster-600' : 'bg-slate-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                        animate={{ left: isAgentMode ? '1.75rem' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>

                  {isAgentMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-600"
                    >
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Agent is active and will auto-join rounds
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        The AI agent will automatically decide when to join the pot based on current conditions.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Push Notifications */}
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <NotificationSettings />
                </div>

                {/* Info Section */}
                <div className="bg-ocean-600/20 border border-ocean-500 rounded-xl p-4">
                  <h4 className="font-semibold text-ocean-300 mb-2 flex items-center gap-2">
                    <span>💡</span> About Agent Mode
                  </h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• AI analyzes pot conditions before joining</li>
                    <li>• Auto-joins when odds are favorable</li>
                    <li>• Chats with other lobsters automatically</li>
                    <li>• Maximum 10 joins per day</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                <p className="text-xs text-gray-500">
                  LobsterPot v1.0 | Built for Monad Hackathon 🦞
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
